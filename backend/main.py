from fastapi import FastAPI, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pandas as pd
from presence_analyzer import PresenceAnalyzer
import tempfile
import os
from datetime import datetime, timedelta
import json
import uuid
from typing import List, Dict
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from fastapi.responses import JSONResponse


# Définition du répertoire temporaire
TEMP_DIR = "temp_reports"
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)



class Modification(BaseModel):
    field: str  # Le champ modifié (retard, heures_sup, etc.)
    old_value: str  # Ancienne valeur
    new_value: str  # Nouvelle valeur
    date: str  # Date concernée
    reason: Optional[str] = None  # Raison de la modification

class ModificationRequest(BaseModel):
    employee: str
    modifications: List[Modification]


app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Plus permissif pour le développement
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supprimez la route @app.options("/import-report") car elle n'est plus nécessaire


def format_timedelta(td):
    if pd.isnull(td) or td == timedelta(0):
        return "00:00"
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    return f"{hours:02d}:{minutes:02d}"

def calculate_detailed_stats(stats_df):
    """Calcule les statistiques détaillées"""
    # Conversion des données quotidiennes en format JSON pour le frontend
    daily_stats = []
    for _, row in stats_df.iterrows():
        daily_stats.append({
            'Date': row['Date'].strftime('%Y-%m-%d') if isinstance(row['Date'], (datetime, pd.Timestamp)) else row['Date'],
            'Name': row['Name'],
            'Retard': row['Retard'],
            'Depart_Anticipe': row['Depart_Anticipe'],
            'Heures_Sup_50': row['Heures_Sup_50'],
            'Heures_Sup_100': row['Heures_Sup_100'],
            'Pause_Effective': row['Pause_Effective'],
            'Temps_Travail': row['Temps_Travail'],
            'Penalites': row['Penalites']
        })
    
    total_stats = {
        # Statistiques totales
        "total_retards": format_timedelta(stats_df['Retard'].sum()),
        "total_heures_sup_50": format_timedelta(stats_df['Heures_Sup_50'].sum()),
        "total_heures_sup_100": format_timedelta(stats_df['Heures_Sup_100'].sum()),
        "total_temps_travail": format_timedelta(stats_df['Temps_Travail'].sum()),
        "moyenne_temps_travail": format_timedelta(stats_df['Temps_Travail'].mean()),
        "stats_par_employe": [],
        "daily_records": daily_stats  # Ajout des données quotidiennes
    }
    
    # Statistiques par employé
    for name, group in stats_df.groupby('Name'):
        employee_stats = {
            "nom": name,
            "retards": format_timedelta(group['Retard'].sum()),
            "heures_sup": format_timedelta(group['Heures_Sup_50'].sum() + group['Heures_Sup_100'].sum()),
            "temps_travail": format_timedelta(group['Temps_Travail'].sum()),
            "jours_travailles": len(group[group['Temps_Travail'] > timedelta(0)])
        }
        total_stats["stats_par_employe"].append(employee_stats)

    return total_stats

@app.post("/employees")
async def get_employees(file: UploadFile):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        analyzer = PresenceAnalyzer()
        attendance_data = analyzer.transform_raw_data(temp_path)
        employees = attendance_data['Name'].unique().tolist()

        os.unlink(temp_path)
        
        return {"employees": employees}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_file(file: UploadFile, params: str = Form(...)):
    try:
        analysis_params = json.loads(params)
        
        if not file.filename.endswith(('.xls', '.xlsx')):
            raise HTTPException(status_code=400, detail="Format de fichier non supporté")

        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

            

        analyzer = PresenceAnalyzer()

        contract_ends = analysis_params.get('contractEnds', {})
        for employee, end_date in contract_ends.items():
            if end_date:
                analyzer.set_contract_end(employee, end_date)
        try:
            # Transformation des données
            attendance_data = analyzer.transform_raw_data(temp_path)
            
            # Configuration des jours de repos
            for rest_day_config in analysis_params.get('restDays', []):
                employee = rest_day_config['employeeName']
                days = rest_day_config['days']
                analyzer.employee_rest_days[employee] = days
            
            # Complétion des données
            completed_data = analyzer.complete_missing_data(attendance_data)
            
            # Conversion des dates de congés
            holidays = [datetime.strptime(h['date'], '%Y-%m-%d').date() 
                       for h in analysis_params.get('holidays', [])]
            
            # Préparation des périodes de congés
            employee_leave_periods = {}
            for leave in analysis_params.get('leavePeriods', []):
                employee = leave['employeeName']
                start = datetime.strptime(leave['startDate'], '%Y-%m-%d').date()
                end = datetime.strptime(leave['endDate'], '%Y-%m-%d').date()
                leave_type = leave.get('leaveType', 'Congé annuel')
                if employee not in employee_leave_periods:
                    employee_leave_periods[employee] = []
            
                employee_leave_periods[employee].append((start, end, leave_type))

            # Calcul des statistiques complètes
            stats = analyzer.calculate_statistics(completed_data)

            # Fonction pour vérifier les jours de repos
            def is_rest_day(row, employee_rest_days):
                weekday = pd.to_datetime(row['Date']).dayofweek
                return weekday in employee_rest_days.get(row['Name'], [4, 5])
            
            # Calcul des absences en excluant les jours de repos
            absences = stats[
                (stats['Temps_Travail'] == timedelta(0)) & 
                (~stats.apply(lambda row: is_rest_day(row, analyzer.employee_rest_days), axis=1))
            ]
            
            net_absences, net_absences_total = analyzer.calculate_net_absences(
                absences, holidays, employee_leave_periods
            )

            # Génération du rapport Excel
            report_id = str(uuid.uuid4())
            report_path = os.path.join(TEMP_DIR, f"rapport_{report_id}.xlsx")
            
            with pd.ExcelWriter(report_path) as writer:
                # Détails journaliers
                detailed_stats = stats.copy()
                for col in ['Retard', 'Depart_Anticipe', 'Heures_Sup_50', 'Heures_Sup_100', 
                           'Pause_Effective', 'Temps_Travail', 'Penalites']:
                    detailed_stats[col] = detailed_stats[col].apply(format_timedelta)
                detailed_stats.to_excel(writer, 'Statistiques_Detaillees', index=False)

                # Statistiques par employé
                employee_stats = stats.groupby('Name').agg({
                    'Retard': 'sum',
                    'Depart_Anticipe': 'sum',
                    'Heures_Sup_50': 'sum',
                    'Heures_Sup_100': 'sum',
                    'Pause_Effective': 'sum',
                    'Temps_Travail': 'sum',
                    'Penalites': 'sum'
                }).reset_index()
                
                for col in employee_stats.columns:
                    if col != 'Name':
                        employee_stats[col] = employee_stats[col].apply(format_timedelta)
                
                employee_stats.to_excel(writer, 'Statistiques_Par_Employe', index=False)
                
                # Autres onglets
                net_absences.to_excel(writer, 'Absences_Nettes', index=False)
                net_absences_total.to_excel(writer, 'Total_Absences', index=False)
                pd.DataFrame({'Jours_Feries': holidays}).to_excel(writer, 'Jours_Feries', index=False)
                
                # Congés
                leave_data = []
                for emp, periods in employee_leave_periods.items():
                    for start, end, leave_type in periods:
                        nb_jours = (end - start).days + 1
                        leave_data.append({
                            'Employe': emp,
                            'Debut': start.strftime('%Y-%m-%d'),
                            'Fin': end.strftime('%Y-%m-%d'),
                            'Type': leave_type,
                            'Nombre_Jours': nb_jours
                        })
                pd.DataFrame(leave_data).to_excel(writer, 'Conges', index=False)

            # Calcul des statistiques pour l'interface web
            detailed_stats = calculate_detailed_stats(stats)

            absences_data = net_absences[['Name', 'Date']].to_dict('records')
            for absence in absences_data:
                if isinstance(absence['Date'], (datetime, pd.Timestamp)):
                    absence['Date'] = absence['Date'].strftime('%Y-%m-%d')

            # Calcul des statistiques pour l'interface web
            detailed_stats = calculate_detailed_stats(stats)

            # Préparation des données de congés
            leave_data = []
            for emp, periods in employee_leave_periods.items():
                for start, end, leave_type in periods:
                    leave_data.append({
                        'Employe': emp,
                        'Debut': start.strftime('%Y-%m-%d'),
                        'Fin': end.strftime('%Y-%m-%d'),
                        'Type': leave_type,
                        'Nombre_Jours': (end - start).days + 1
                    })

            return {
                "status": "success",
                "filename": file.filename,
                "report_id": report_id,
                "analysis": {
                    "total_records": len(completed_data),
                    "employees": completed_data['Name'].nunique(),
                    "date_range": {
                        "start": completed_data['Date'].min().strftime('%Y-%m-%d'),
                        "end": completed_data['Date'].max().strftime('%Y-%m-%d')
                    }
                },
                "detailed_stats": detailed_stats,
                "conges": leave_data,
                "absences": net_absences[['Name', 'Date']].to_dict('records'),
                "message": "Fichier analysé avec succès"
            }

        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@app.get("/download/{report_id}")
async def download_report(report_id: str):
    report_path = os.path.join(TEMP_DIR, f"rapport_{report_id}.xlsx")
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    
    return FileResponse(
        report_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"rapport_presence_{datetime.now().strftime('%Y%m%d')}.xlsx"
    )

@app.on_event("startup")
async def cleanup_old_reports():
    if os.path.exists(TEMP_DIR):
        for file in os.listdir(TEMP_DIR):
            file_path = os.path.join(TEMP_DIR, file)
            if os.path.isfile(file_path):
                os.unlink(file_path)


@app.post("/import-report")
async def import_report(file: UploadFile):
    """Importe et analyse le rapport Excel existant"""
    try:
        if not file.filename.endswith('.xlsx'):
            raise HTTPException(status_code=400, detail="Le fichier doit être au format .xlsx")

        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            # Lire le fichier Excel
            stats_df = pd.read_excel(temp_path, sheet_name='Statistiques_Detaillees')
            
            # Obtenir la liste des employés
            employees = stats_df['Name'].unique().tolist()
            
            # Convertir les données en format JSON
            data = stats_df.to_dict('records')
            
            return {
                "status": "success",
                "message": "Rapport importé avec succès",
                "data": data,
                "employees": employees,
                "total_records": len(data)
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur lors de la lecture du fichier: {str(e)}")
        
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")                


@app.post("/save-modifications")
async def save_modifications(request: ModificationRequest):
    """Sauvegarde les modifications avec historique"""
    try:
        # Créer le fichier d'historique s'il n'existe pas
        history_file = os.path.join(TEMP_DIR, "modifications_history.json")
        
        # Charger l'historique existant
        if os.path.exists(history_file):
            with open(history_file, 'r') as f:
                history = json.load(f)
        else:
            history = []

        # Ajouter les nouvelles modifications avec timestamp
        new_entry = {
            "timestamp": datetime.now().isoformat(),
            "employee": request.employee,
            "modifications": [mod.dict() for mod in request.modifications]
        }
        
        history.append(new_entry)

        # Sauvegarder l'historique mis à jour
        with open(history_file, 'w') as f:
            json.dump(history, f, indent=2)

        return {
            "status": "success",
            "message": "Modifications sauvegardées",
            "modification_id": len(history) - 1  # Index pour pouvoir annuler
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la sauvegarde des modifications: {str(e)}"
        )

# Route pour obtenir l'historique des modifications
@app.get("/modifications-history/{employee}")
async def get_modifications_history(employee: str):
    """Récupère l'historique des modifications pour un employé"""
    try:
        history_file = os.path.join(TEMP_DIR, "modifications_history.json")
        
        if not os.path.exists(history_file):
            return {"modifications": []}

        with open(history_file, 'r') as f:
            history = json.load(f)

        # Filtrer l'historique pour l'employé spécifique
        employee_history = [
            entry for entry in history 
            if entry["employee"] == employee
        ]

        return {"modifications": employee_history}

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la récupération de l'historique: {str(e)}"
        )

class ReportGenerationRequest(BaseModel):
    original_data: List[dict]
    modifications: List[dict]
    employee: str

@app.post("/generate-modified-report")
async def generate_modified_report(request: ReportGenerationRequest):
    """Génère un nouveau rapport Excel avec les modifications"""
    try:
        # Convertir les données originales en DataFrame
        df = pd.DataFrame(request.original_data)
        
        # Appliquer les modifications
        for mod in request.modifications:
            mask = (df['Name'] == request.employee) & (df['Date'] == mod['date'])
            df.loc[mask, mod['field']] = mod['new_value']

        # Créer un nouveau rapport
        report_id = str(uuid.uuid4())
        report_path = os.path.join(TEMP_DIR, f"rapport_modifie_{report_id}.xlsx")
        
        with pd.ExcelWriter(report_path) as writer:
            # Données modifiées
            df.to_excel(writer, 'Statistiques_Detaillees', index=False)
            
            # Historique des modifications
            history_df = pd.DataFrame(request.modifications)
            history_df['employee'] = request.employee
            history_df['timestamp'] = datetime.now().isoformat()
            history_df.to_excel(writer, 'Historique_Modifications', index=False)

            # Calcul des nouvelles statistiques
            employee_stats = df[df['Name'] == request.employee].agg({
                'Retard': 'sum',
                'Heures_Sup_50': 'sum',
                'Heures_Sup_100': 'sum',
                'Temps_Travail': 'sum',
                'Penalites': 'sum'
            }).to_frame().transpose()
            
            employee_stats.to_excel(writer, 'Resume_Modifications', index=False)

        return {
            "status": "success",
            "message": "Nouveau rapport généré",
            "report_id": report_id,
            "file_path": report_path
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du rapport: {str(e)}"
        )

# Route pour télécharger le rapport modifié
@app.get("/download-modified-report/{report_id}")
async def download_modified_report(report_id: str):
    """Télécharge le rapport modifié"""
    try:
        report_path = os.path.join(TEMP_DIR, f"rapport_modifie_{report_id}.xlsx")
        
        if not os.path.exists(report_path):
            raise HTTPException(status_code=404, detail="Rapport non trouvé")
            
        return FileResponse(
            report_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"rapport_modifie_{datetime.now().strftime('%Y%m%d')}.xlsx"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du téléchargement: {str(e)}"
        )        
    

@app.get("/test")
async def test():
    return {"message": "Server is running"}    

