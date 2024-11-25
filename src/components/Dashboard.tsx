import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Clock, Users, AlertTriangle, Calendar, ArrowLeft } from 'lucide-react';

// Interfaces pour les données détaillées
interface DailyStats {
  Name: string;
  Date: string;
  Retard: string;
  Depart_Anticipe: string;
  Heures_Sup_50: string;
  Heures_Sup_100: string;
  Pause_Effective: string;
  Temps_Travail: string;
  Penalites: string;
  Status?: string;
  Jour_Repos?: boolean;
}

interface EmployeeStats {
  nom: string;
  retards: string;
  heures_sup: string;
  temps_travail: string;
  jours_travailles: number;
}

interface DetailedStats {
  total_retards: string;
  total_heures_sup_50: string;
  total_heures_sup_100: string;
  total_temps_travail: string;
  moyenne_temps_travail: string;
  stats_par_employe: EmployeeStats[];
}

interface Conge {
  Employe: string;
  Debut: string;
  Fin: string;
  Type: string;
  Nombre_Jours: number;
}

interface Absence {
  Name: string;
  Date: string;
}

interface AnalysisResult {
  status: string;
  filename: string;
  report_id: string;
  analysis: {
    total_records: number;
    employees: number;
    date_range: {
      start: string;
      end: string;
    }
  };
  detailed_stats: DetailedStats;
  daily_records?: DailyStats[];
  absences?: Absence[];
  conges?: Conge[];
  message: string;
}

interface DashboardProps {
  analysisResult: AnalysisResult;
}

// Fonctions utilitaires pour le formatage et la conversion des temps
const formatTooltipValue = (value: number | string) => {
  if (typeof value === 'number') {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }
  return value;
};

const convertTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Constantes
const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b'];

// Fonctions utilitaires
const convertTimeToDecimal = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

const formatTime = (timeStr: string): string => {
  if (!timeStr) return "00:00";
  return timeStr;
};

const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'présent':
      return 'text-green-600';
    case 'absent':
      return 'text-red-600';
    case 'congé':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};
const Dashboard: React.FC<DashboardProps> = ({ analysisResult }) => {
  const [activeView, setActiveView] = useState<'general' | 'detail' | 'employee'>('general');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: analysisResult.analysis.date_range.start,
    end: analysisResult.analysis.date_range.end
  });

  const employeeData = useMemo(() => {
    if (!analysisResult?.detailed_stats) return [];
    
    return analysisResult.detailed_stats.stats_par_employe.map(emp => ({
      name: emp.nom,
      retards: convertTimeToDecimal(emp.retards),
      tempsTravail: convertTimeToDecimal(emp.temps_travail),
      heuresSup: convertTimeToDecimal(emp.heures_sup)
    }));
  }, [analysisResult?.detailed_stats]);

  if (!analysisResult?.detailed_stats) return null;

  const stats = analysisResult.detailed_stats;

  // Préparation des données pour les graphiques
  

  // Vue Générale
  const GeneralView = () => (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Temps Total Travaillé</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_temps_travail}</p>
              <p className="text-sm text-gray-600">Moyenne: {stats.moyenne_temps_travail}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500">Total Retards</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_retards}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Heures Supplémentaires</p>
              <p className="text-lg font-bold">50%: {stats.total_heures_sup_50}</p>
              <p className="text-lg font-bold">100%: {stats.total_heures_sup_100}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Répartition par employé</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toFixed(2) + " heures"} />
                <Legend />
                <Bar dataKey="tempsTravail" fill={COLORS[0]} name="Temps Travail" />
                <Bar dataKey="retards" fill={COLORS[1]} name="Retards" />
                <Bar dataKey="heuresSup" fill={COLORS[2]} name="Heures Sup" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Distribution des heures</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Temps Travail', value: convertTimeToDecimal(stats.total_temps_travail) },
                    { name: 'Heures Sup 50%', value: convertTimeToDecimal(stats.total_heures_sup_50) },
                    { name: 'Heures Sup 100%', value: convertTimeToDecimal(stats.total_heures_sup_100) }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toFixed(2) + " heures"} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );

  // Vue Détaillée
  const DetailView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Détails par employé</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temps Travail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retards</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heures Sup</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jours Travaillés</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.stats_par_employe.map((employe, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employe.nom}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(employe.temps_travail)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(employe.retards)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(employe.heures_sup)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employe.jours_travailles}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                    <button onClick={() => {
                      setSelectedEmployee(employe.nom);
                      setActiveView('employee');
                    }}>
                      Voir détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  // Vue Détaillée par Employé
  const EmployeeView = () => {
    if (!selectedEmployee) return null;
    
    const employeeStats = stats.stats_par_employe.find(emp => emp.nom === selectedEmployee);
    if (!employeeStats) return null;

    // Filtrer les données détaillées pour l'employé sélectionné
    const employeeDailyStats = analysisResult.daily_records?.filter(
      record => record.Name === selectedEmployee
    ) || [];

    // Filtrer les congés pour l'employé sélectionné
    const employeeLeaves = analysisResult.conges?.filter(
      conge => conge.Employe === selectedEmployee
    ) || [];

    // Filtrer les absences pour l'employé sélectionné
    const employeeAbsences = analysisResult.absences?.filter(
      absence => absence.Name === selectedEmployee
    ) || [];

    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveView('detail')}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee}</h2>
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Temps de Travail</h3>
            <p className="mt-2 text-xl font-semibold text-gray-900">{employeeStats.temps_travail}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Retards</h3>
            <p className="mt-2 text-xl font-semibold text-gray-900">{employeeStats.retards}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Heures Supplémentaires</h3>
            <p className="mt-2 text-xl font-semibold text-gray-900">{employeeStats.heures_sup}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Jours Travaillés</h3>
            <p className="mt-2 text-xl font-semibold text-gray-900">{employeeStats.jours_travailles}</p>
          </div>
        </div>

        {/* Détails Quotidiens */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Détails Quotidiens</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retard</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Départ Anticipé</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures Sup 50%</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures Sup 100%</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pause Effective</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temps Travail</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pénalités</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeDailyStats.map((day, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{day.Date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatTime(day.Retard)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatTime(day.Depart_Anticipe)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatTime(day.Heures_Sup_50)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatTime(day.Heures_Sup_100)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatTime(day.Pause_Effective)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatTime(day.Temps_Travail)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatTime(day.Penalites)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Congés */}
        {employeeLeaves.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Congés</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Début</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeLeaves.map((conge, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{conge.Debut}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{conge.Fin}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{conge.Type}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{conge.Nombre_Jours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Absences */}
        {employeeAbsences.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Absences</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeAbsences.map((absence, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{absence.Date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      {activeView !== 'employee' && (
        <div className="flex space-x-4 pb-4 border-b">
          <button
            className={`px-4 py-2 rounded-lg ${activeView === 'general' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            onClick={() => setActiveView('general')}
          >
            Vue Générale
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${activeView === 'detail' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            onClick={() => setActiveView('detail')}
          >
            Détails
          </button>
        </div>
      )}

      {/* Période */}
      <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
        <Calendar className="w-5 h-5 text-gray-500" />
        <span className="text-sm text-gray-500">
          Période : {dateRange.start} au {dateRange.end}
        </span>
      </div>

      {/* Contenu */}
      {activeView === 'general' && <GeneralView />}
      {activeView === 'detail' && <DetailView />}
      {activeView === 'employee' && <EmployeeView />}
    </div>
  );
};

export default Dashboard;