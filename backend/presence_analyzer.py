import pandas as pd
import os
from datetime import datetime, time, timedelta
from collections import defaultdict
from enum import Enum

class LeaveType(str, Enum):
    ANNUAL = "Congé annuel"
    SICK = "Congé maladie"
    EXCEPTIONAL = "Congé exceptionnel"
    UNPAID = "Congé sans solde"
    PARENTAL = "Congé maternité/paternité"
    @classmethod
    def get_all_types(cls):
        return [cls.ANNUAL, cls.SICK, cls.EXCEPTIONAL, cls.UNPAID, cls.PARENTAL]

class PresenceAnalyzer:
    def __init__(self):
        # Configuration des jours de travail
        self.working_days = [5, 6, 0, 1, 2, 3]  # Samedi à Jeudi
        
        # Configuration des heures
        self.standard_start = time(8, 30)  # Heure début
        self.standard_end = time(17, 0)    # Heure fin
        self.overtime_threshold = time(17, 15)  # Seuil heures sup
        self.night_threshold = time(21, 0)  # Seuil nuit

        # Configuration des temps de travail
        self.standard_duration = timedelta(hours=8, minutes=30)  # Durée standard (8h30)
        self.workday_duration = timedelta(hours=8, minutes=30)  # Durée journée (8h30)
        self.standard_pause = timedelta(minutes=45)  # Pause standard
        self.working_hours = timedelta(hours=8)  # Heures effectives
        self.standard_day_duration = self.workday_duration  # 8h30 total

        # Configuration des pauses
        self.pause_min_time = time(11, 0)  # Début période pause
        self.pause_max_time = time(16, 0)  # Fin période pause
        self.pause_penalty = timedelta(minutes=75)  # Pénalité oubli check (1h15)
        self.pause_outside_penalty = timedelta(minutes=10)  # Pénalité hors période
        self.max_pause_allowed = timedelta(minutes=50)  # Tolérance max pause
        self.reduced_pause = timedelta(minutes=15)  # Pause réduite

        # Configuration des retards
        self.late_threshold = timedelta(minutes=5)  # Seuil retard
        self.large_late_threshold = timedelta(hours=3)  # Retard important
        self.weekly_late_penalty = timedelta(minutes=15)  # Pénalité retard

        # Configuration par défaut
        self.default_entry = time(9, 30)
        self.default_exit = time(16, 0)

        # Initialisation des structures
        self.employee_rest_days = {}  # Jours repos par employé
        self.contracts = {}  # Pour gérer les fins de contrat

    def _calculate_daily_balance(self, entry_time, exit_time):
        """Nouvelle méthode pour calculer le bilan journalier"""
        if pd.isnull(entry_time) or pd.isnull(exit_time):
            return {
                'retard': timedelta(0),
                'heures_sup_50': timedelta(0),
                'heures_sup_100': timedelta(0),
                'temps_travail': timedelta(0)
            }

        # Calcul du temps total de présence
        total_duration = self._time_diff(entry_time, exit_time)
        
        # Soustraire la pause standard
        working_duration = total_duration - self.standard_pause

        # Comparaison avec la durée standard (8h30)
        if working_duration >= self.standard_duration:
            # Cas où l'employé a fait ses heures
            heures_sup = working_duration - self.standard_duration
            
            # Déterminer si heures sup 50% ou 100%
            if isinstance(exit_time, datetime):
                exit_hour = exit_time.time()
            else:
                exit_hour = exit_time

            if exit_hour >= time(21, 0):  # Après 21h = 100%
                heures_sup_100 = heures_sup
                heures_sup_50 = timedelta(0)
            else:
                heures_sup_50 = heures_sup
                heures_sup_100 = timedelta(0)

            return {
                'retard': timedelta(0),
                'heures_sup_50': heures_sup_50,
                'heures_sup_100': heures_sup_100,
                'temps_travail': self.standard_duration
            }
        else:
            # Cas où l'employé n'a pas fait ses heures
            return {
                'retard': self.standard_duration - working_duration,
                'heures_sup_50': timedelta(0),
                'heures_sup_100': timedelta(0),
                'temps_travail': working_duration
            }    


    def set_contract_end(self, employee, end_date):
        """Définit la date de fin de contrat"""
        self.contracts[employee] = datetime.strptime(end_date, '%Y-%m-%d').date()

    def is_active(self, employee, date):
        """Vérifie si l'employé est actif à une date"""
        if employee in self.contracts:
            return date.date() <= self.contracts[employee]
        return True    

    def detect_and_manage_rest_days(self, df, employee_name):
        """Détecte et gère les jours de repos pour un employé"""
        print(f"\nAnalyse des jours de repos pour {employee_name}...")
        
        # Filtrer les données pour l'employé
        employee_data = df[df['Name'] == employee_name].copy()
        
        if employee_data.empty:
            return self.default_rest_days()
        
        # Convertir les dates en jours de la semaine et compter les absences
        employee_data['Weekday'] = pd.to_datetime(employee_data['Date']).dt.dayofweek
        absence_counts = employee_data[
            pd.isnull(employee_data['C/In']) & 
            pd.isnull(employee_data['C/Out'])
        ]['Weekday'].value_counts()
        
        # Détecter les jours avec 3 absences ou plus
        detected_rest_days = absence_counts[absence_counts >= 3].index.tolist()
        
        # Afficher les jours détectés
        days_map = {
            0: "Lundi", 1: "Mardi", 2: "Mercredi", 3: "Jeudi",
            4: "Vendredi", 5: "Samedi", 6: "Dimanche"
        }
        
        print(f"\nJours de repos détectés pour {employee_name}:")
        if detected_rest_days:
            for day in detected_rest_days:
                print(f"- {days_map[day]}")
        else:
            print("Aucun pattern détecté")
        
        # Demander confirmation ou modification
        print("\nOptions:")
        print("1. Confirmer les jours détectés")
        print("2. Modifier les jours de repos")
        print("3. Utiliser les jours par défaut (Vendredi, Samedi)")
        
        choice = input("Votre choix (1-3): ")
        
        if choice == "1" and detected_rest_days:
            return detected_rest_days
        elif choice == "2":
            return self.manual_rest_days_input()
        else:
            return self.default_rest_days()

    def default_rest_days(self):
        """Retourne les jours de repos par défaut"""
        return [4, 5]  # Vendredi, Samedi

    def manual_rest_days_input(self):
        """Permet la saisie manuelle des jours de repos"""
        days_map = {
            "1": 0, "2": 1, "3": 2, "4": 3,
            "5": 4, "6": 5, "7": 6
        }
        
        print("\nSélection des jours de repos:")
        print("1. Lundi")
        print("2. Mardi")
        print("3. Mercredi")
        print("4. Jeudi")
        print("5. Vendredi")
        print("6. Samedi")
        print("7. Dimanche")
        
        rest_days = []
        while len(rest_days) < 2:
            day = input(f"Sélectionnez le jour de repos #{len(rest_days)+1} (1-7): ")
            if day in days_map:
                rest_days.append(days_map[day])
            else:
                print("Choix invalide")
        
        return sorted(rest_days)    

    def transform_raw_data(self, input_file):
        """Transform raw attendance data from XLS file"""
        print("1. Transformation des données brutes...")
        
        # Charger les données
        data = pd.read_excel(input_file, engine='xlrd')
        data['Date/Time'] = pd.to_datetime(data['Date/Time'], format='%d/%m/%Y %H:%M:%S')
        
        # Extraire date et heure
        data['Date'] = data['Date/Time'].dt.date
        data['Time'] = data['Date/Time'].dt.time
        data['Day'] = data['Date/Time'].dt.dayofweek
        
        # Filtrer les jours ouvrables
        data = data[data['Day'].isin(self.working_days)]
        
        # Obtenir toutes les entrées/sorties pour calculer les pauses
        result = data.groupby(['Name', 'Date'], as_index=False).apply(self._process_daily_records)
        
        # Créer DataFrame complet avec tous les jours ouvrables
        all_workdays = pd.date_range(start=data['Date'].min(), end=data['Date'].max(), freq='D')
        all_workdays = all_workdays[all_workdays.dayofweek.isin(self.working_days)]
        employees = data['Name'].unique()
        
        # Créer toutes les combinaisons employé-jour
        all_combinations = pd.MultiIndex.from_product(
            [employees, all_workdays.date],
            names=['Name', 'Date']
        )
        
        full_attendance = pd.DataFrame(index=all_combinations).reset_index()
        return full_attendance.merge(result, on=['Name', 'Date'], how='left')
    
    

    def _process_daily_records(self, group):
        """Traite les enregistrements journaliers pour un employé"""
        daily_data = {
            'C/In': group[group['Status'] == 'C/In']['Time'].min(),
            'C/Out': group[group['Status'] == 'C/Out']['Time'].max(),
            'pause_duration': self._calculate_pause_duration(group)
        }
        return pd.Series(daily_data)

    def _calculate_pause_duration(self, group):
        """Calcule la durée de pause avec les nouvelles règles"""
        # Vérifie si on a les entrées/sorties de pause
        pause_entries = group[group['Status'] == 'C/In'].sort_values('Date/Time')
        pause_exits = group[group['Status'] == 'C/Out'].sort_values('Date/Time')
        
        # Cas 1: Pas de check ou check incomplet
        if len(pause_entries) < 2 or len(pause_exits) < 2:
            return self.pause_penalty  # 1h15 de pénalité
            
        # Trouver la pause (entre première sortie et deuxième entrée)
        pause_start = pause_exits.iloc[0]['Date/Time']
        pause_end = pause_entries.iloc[1]['Date/Time']
        
        # Cas 2: Vérifier si la pause est dans l'intervalle autorisé
        if not (self.pause_min_time <= pause_start.time() <= self.pause_max_time and 
                self.pause_min_time <= pause_end.time() <= self.pause_max_time):
            return self.standard_pause + self.pause_outside_penalty  # 45min + 10min
        
        # Cas standard: pause dans l'intervalle
        pause_duration = pause_end - pause_start
        return pause_duration if pause_duration > timedelta(0) else self.standard_pause
        
    def complete_missing_data(self, df):
        """Complete missing check-in/out times"""
        print("2. Complétion des données manquantes...")
        
        def complete_times(row):
            # Si les deux sont manquants, on laisse tel quel (absence)
            if pd.isnull(row['C/In']) and pd.isnull(row['C/Out']):
                return row
            # Si entrée manquante
            elif pd.isnull(row['C/In']):
                row['C/In'] = self.default_entry
            # Si sortie manquante
            elif pd.isnull(row['C/Out']):
                row['C/Out'] = self.default_exit
            return row
        
        # Appliquer la complétion
        completed_df = df.apply(complete_times, axis=1)
        
        # S'assurer que la pause_duration existe
        if 'pause_duration' not in completed_df.columns:
            completed_df['pause_duration'] = self.standard_pause
            
        return completed_df

    def calculate_statistics(self, df):
        """Calculate attendance statistics"""
        print("4. Calcul des statistiques de présence...")
        
        if df.empty:
            return pd.DataFrame()
            
        def process_day(row):
            # Vérifier si l'employé est actif
            if not self.is_active(row['Name'], pd.to_datetime(row['Date'])):
                return pd.Series({
                    'Name': row['Name'],
                    'Date': row['Date'],
                    'Retard': timedelta(0),
                    'Temps_Travail': timedelta(0),
                    'Status': 'Inactif'
                })

            
            # Vérifier si c'est un jour de repos
            weekday = pd.to_datetime(row['Date']).dayofweek
            if weekday in self.employee_rest_days.get(row['Name'], [4, 5]):
                return pd.Series({
                    'Name': row['Name'],
                    'Date': row['Date'],
                    'Retard': timedelta(0),
                    'Depart_Anticipe': timedelta(0),
                    'Heures_Sup_50': timedelta(0),
                    'Heures_Sup_100': timedelta(0),
                    'Pause_Effective': timedelta(0),
                    'Temps_Travail': timedelta(0),
                    'Jour_Repos': True,
                    'Penalites': timedelta(0)
                })

            # Calcul du retard
            retard = self._calculate_late(row['C/In'])

            # Calculer le bilan journalier avec la nouvelle logique
            bilan = self._calculate_daily_balance(row['C/In'], row['C/Out'])
            
            # Calcul de la pause effective
            pause_effective = self._calculate_effective_pause(
                row['C/In'], 
                row.get('pause_duration', self.standard_pause),
                retard
            )
            # Calcul du temps de travail effectif
            temps_travail = self._calculate_working_time(
                row['C/In'], 
                row['C/Out'], 
                pause_effective
            )
            
            # Calcul des heures supplémentaires
            heures_sup_50, heures_sup_100 = self._calculate_overtime(
                row['Date'], 
                row['C/Out'],
                temps_travail
                
            )
            
            # Calcul du départ anticipé
            depart_anticipe = self._calculate_early_departure(row['C/Out'])
            
            
            
            # Calcul des pénalités
            penalites = self._calculate_penalties(row['C/In'])
            
            return pd.Series({
                'Name': row['Name'],
                'Date': row['Date'],
                'Retard': bilan['retard'],
                'Depart_Anticipe': depart_anticipe,
                'Heures_Sup_50': bilan['heures_sup_50'],
                'Heures_Sup_100': bilan['heures_sup_100'],
                'Pause_Effective': pause_effective,
                'Temps_Travail': bilan['temps_travail'],
                'Penalites': penalites
            })
        
        return df.apply(process_day, axis=1)

    def _calculate_late(self, entry_time):
        """Calcule le retard"""
        if pd.isnull(entry_time) or entry_time <= self.standard_start:
            return timedelta(0)
        return self._time_diff(self.standard_start, entry_time)

    def _calculate_effective_pause(self, entry_time, pause_duration, retard):
        """Calcule la durée effective de la pause"""
        if pd.isnull(entry_time):
            return self.standard_pause
            
        # Si retard ≥ 3h, pause réduite de 15 minutes
        if retard >= self.large_late_threshold:
            if pause_duration > self.reduced_pause:
                return pause_duration  # Le dépassement sera déduit du temps de travail
            return self.reduced_pause
            
        # Pause normale avec tolérance jusqu'à 50 minutes
        if pause_duration <= self.max_pause_allowed:
            return self.standard_pause
            
        # Si dépassement, on garde la durée réelle qui sera déduite
        return pause_duration

    def _calculate_overtime(self, date, exit_time, temps_travail):  # On enlève working_time ici
            """Calcule les heures supplémentaires"""
            if temps_travail < self.workday_duration:  # Vérifier 8h30
                return timedelta(0), timedelta(0)
            if pd.isnull(exit_time):
                return timedelta(0), timedelta(0)
                    
            if isinstance(date, str):
                date = pd.to_datetime(date).date()
                    
            # Vendredi = 100%
            if date.weekday() == 4:
                return timedelta(0), self._time_diff(self.standard_end, exit_time)
                    
            # Après 21h = 100%
            if exit_time >= self.night_threshold:
                overtime_50 = self._time_diff(
                    self.overtime_threshold, 
                    datetime.combine(datetime.min, self.night_threshold).time()
                )
                overtime_100 = self._time_diff(self.night_threshold, exit_time)
                return overtime_50, overtime_100
                    
            # Après 17h15 = 50%
            if exit_time >= self.overtime_threshold:
                return self._time_diff(self.overtime_threshold, exit_time), timedelta(0)
                    
            return timedelta(0), timedelta(0)

    def calculate_late_penalties(self, df):
        """Calcule les pénalités de retard hebdomadaires"""
        print("3. Calcul des pénalités de retard...")
        
        # Grouper les données par employé et par semaine
        df['Week'] = pd.to_datetime(df['Date']).dt.isocalendar().week
        df['Year'] = pd.to_datetime(df['Date']).dt.isocalendar().year
        
        def calculate_week_penalties(group):
            late_count = sum(1 for time in group['C/In'] 
                           if pd.notnull(time) and 
                           self._time_diff(self.standard_start, time) >= self.late_threshold)
            return self.weekly_late_penalty * (late_count - 1) if late_count > 1 else timedelta(0)
        
        penalties = df.groupby(['Name', 'Year', 'Week']).apply(calculate_week_penalties)
        return penalties.reset_index(name='Weekly_Penalties')

    def _calculate_penalties(self, entry_time):
        """Calcule les pénalités individuelles"""
        if pd.isnull(entry_time):
            return timedelta(0)
        
        retard = self._time_diff(self.standard_start, entry_time)
        if retard >= self.late_threshold:
            return self.weekly_late_penalty
        return timedelta(0)

    def _calculate_early_departure(self, exit_time):
        """Calcule le départ anticipé"""
        if pd.isnull(exit_time) or exit_time >= self.standard_end:
            return timedelta(0)
        return self._time_diff(exit_time, self.standard_end)

    def _calculate_working_time(self, entry_time, exit_time, pause_effective):
        """Calcule le temps de travail selon la règle des 8h30"""
        if pd.isnull(entry_time) or pd.isnull(exit_time):
            return timedelta(0)
                
        # 1. Calculer le temps total de présence
        total_time = self._time_diff(entry_time, exit_time)
        
        # 2. Soustraire la pause effective
        working_time = total_time - pause_effective
        
        # 3. La journée doit faire 8h30 dont 45min de pause
        if working_time < self.workday_duration:
            return working_time  # Si moins de 8h30, temps réel
        
        return self.workday_duration  # Si égal ou plus de 8h30

    def _time_diff(self, time1, time2):
        """Calcule la différence entre deux temps"""
        if isinstance(time1, time):
            time1 = datetime.combine(datetime.min, time1)
        if isinstance(time2, time):
            time2 = datetime.combine(datetime.min, time2)
        return abs(time2 - time1)

    def get_holidays(self):
        """Get holiday dates from user input"""
        holidays = []
        print("\nSaisie des jours fériés:")
        while True:
            date_str = input("Entrez un jour férié (JJ/MM/YYYY) ou Entrée pour terminer: ")
            if date_str == "":
                break
            try:
                holiday = datetime.strptime(date_str, "%d/%m/%Y").date()
                holidays.append(holiday)
            except ValueError:
                print("Format invalide. Utilisez JJ/MM/YYYY.")
        return holidays

    def get_leave_periods_for_employee(self, employee_name):
        """Get leave periods for an employee"""
        leave_periods = []
        print(f"\nSaisie des congés pour {employee_name}:")
        while True:
            start_str = input("Date début congé (JJ/MM/YYYY) ou Entrée pour terminer: ")
            if start_str == "":
                break
            end_str = input("Date fin congé (JJ/MM/YYYY): ")
            # Ajouter ceci
            print("\nTypes de congés disponibles:")
            for i, leave_type in enumerate(LeaveType.get_all_types(), 1):
                print(f"{i}. {leave_type}")
            type_choice = input("Choisir le type de congé (1-5): ")
            leave_type = LeaveType.get_all_types()[int(type_choice)-1]
            
            try:
                start = datetime.strptime(start_str, "%d/%m/%Y").date()
                end = datetime.strptime(end_str, "%d/%m/%Y").date()
                leave_periods.append((start, end, leave_type))  # Ajout du type
            except ValueError:
                print("Format invalide. Utilisez JJ/MM/YYYY.")
        return leave_periods

    def is_leave_day(self, date, leave_periods):
        """Check if a date falls within leave periods"""
        return any(start <= date <= end for start, end, _ in leave_periods)

    def calculate_net_absences(self, absence_details, holidays, employee_leave_periods):
        """Calculate net absences considering holidays and leave"""
        print("Calcul des absences nettes...")
        
        net_absences = []
        for _, row in absence_details.iterrows():
            date = pd.to_datetime(row['Date']).date()
            if (date not in holidays and 
                not self.is_leave_day(date, employee_leave_periods.get(row['Name'], []))):
                net_absences.append(row)

        net_absences_df = pd.DataFrame(net_absences)
        if not net_absences_df.empty:
            net_absences_total = (net_absences_df.groupby('Name')
                                .size()
                                .reset_index(name='Total Absences Nettes'))
        else:
            net_absences_total = pd.DataFrame(columns=['Name', 'Total Absences Nettes'])
        
        return net_absences_df, net_absences_total

    def generate_monthly_report(self, df, month, year):
        """Génère un rapport mensuel"""
        print(f"Génération du rapport pour {month}/{year}")
        
        # Convertir la colonne Date en datetime si ce n'est pas déjà fait
        df['Date'] = pd.to_datetime(df['Date'])
        
        # Filtrer les données pour le mois et l'année spécifiés
        monthly_data = df[
            (df['Date'].dt.month == month) & 
            (df['Date'].dt.year == year)
        ]
        
        # Calculer les statistiques
        stats = self.calculate_statistics(monthly_data)
        
        # Calculer les pénalités de retard
        penalties = self.calculate_late_penalties(monthly_data)
        
        return stats, penalties

    def save_results(self, stats, holidays, employee_leave_periods, output_file):
        """Save all results to Excel file"""
        print(f"\nSauvegarde des résultats dans {output_file}...")

        def format_timedelta(td):
            if pd.isnull(td) or td == timedelta(0):
                return "00:00"
            total_seconds = int(td.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            return f"{hours:02d}:{minutes:02d}"

        # Préparation des rapports quotidiens
        daily_stats = stats.copy()
        time_columns = ['Retard', 'Depart_Anticipe', 'Heures_Sup_50', 
                       'Heures_Sup_100', 'Pause_Effective', 'Temps_Travail', 'Penalites']
        
        for col in time_columns:
            if col in daily_stats.columns:
                daily_stats[col] = daily_stats[col].apply(format_timedelta)

        # Calculer les absences
        absences = stats[stats['Temps_Travail'] == timedelta(0)][['Name', 'Date']]
        
        # Calculer les absences nettes
        net_absences_df, net_absences_total = self.calculate_net_absences(
            absences, holidays, employee_leave_periods
        )

        # Préparer le rapport des congés
        leave_report = []
        for employee, periods in employee_leave_periods.items():
             for start, end, leave_type in periods:
                nb_jours = (end - start).days + 1
                leave_report.append({
                    'Name': employee,
                    'Type': leave_type,
                    'Start_Date': start,
                    'End_Date': end,
                    'Nombre_Jours': nb_jours
                })
        leave_df = pd.DataFrame(leave_report)

        # Calculer les statistiques mensuelles par employé
        monthly_stats = stats.groupby('Name').agg({
            'Retard': 'sum',
            'Depart_Anticipe': 'sum',
            'Heures_Sup_50': 'sum',
            'Heures_Sup_100': 'sum',
            'Temps_Travail': 'sum',
            'Penalites': 'sum'
        }).reset_index()

        for col in monthly_stats.columns:
            if col != 'Name':
                monthly_stats[col] = monthly_stats[col].apply(format_timedelta)

        # Sauvegarder tous les rapports
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            daily_stats.to_excel(writer, 'Rapport_Quotidien', index=False)
            monthly_stats.to_excel(writer, 'Statistiques_Mensuelles', index=False)
            absences.to_excel(writer, 'Absences_Brutes', index=False)
            net_absences_df.to_excel(writer, 'Absences_Nettes', index=False)
            net_absences_total.to_excel(writer, 'Total_Absences_Nettes', index=False)
            
            if not leave_df.empty:
                leave_df.to_excel(writer, 'Registre_Conges', index=False)
            
            pd.DataFrame({'Jours_Feries': holidays}).to_excel(
                writer, 'Jours_Feries', index=False
            )


def main():
    analyzer = PresenceAnalyzer()
    
    try:
        # Chemins des fichiers
        input_file = input("Entrez le chemin du fichier d'entrée XLS: ")
        output_file = input("Entrez le chemin du fichier de sortie Excel: ")
        
        print("\nDébut de l'analyse de présence...")
        
        # Récupérer les jours fériés
        holidays = analyzer.get_holidays()
        
        # Transformation des données
        attendance_data = analyzer.transform_raw_data(input_file)
        completed_data = analyzer.complete_missing_data(attendance_data)

        # Détecter les jours de repos
        
        print("\nDétection des jours de repos...")
        for employee in attendance_data['Name'].unique():
            analyzer.employee_rest_days[employee] = analyzer.detect_and_manage_rest_days(
                attendance_data, 
                employee
            )
        # Récupérer les congés pour chaque employé
        employee_leave_periods = {}
        for employee in completed_data['Name'].unique():
            employee_leave_periods[employee] = analyzer.get_leave_periods_for_employee(employee)
        
        # Demander le mois et l'année à analyser
        month = int(input("\nEntrez le mois à analyser (1-12): "))
        year = int(input("Entrez l'année à analyser (YYYY): "))
        
        # Calcul des statistiques mensuelles
        stats, penalties = analyzer.generate_monthly_report(
            completed_data, 
            month,
            year
        )
        
        # Sauvegarder les résultats
        if not stats.empty:
            analyzer.save_results(stats, holidays, employee_leave_periods, output_file)
            print("\nAnalyse terminée avec succès!")
            print(f"Résultats sauvegardés dans: {output_file}")
        else:
            print(f"\nAucune donnée trouvée pour le mois {month} de l'année {year}")
        
    except Exception as e:
        print(f"\nErreur lors de l'analyse: {str(e)}")
        raise

if __name__ == "__main__":
    main()                