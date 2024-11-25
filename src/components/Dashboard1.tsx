import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
         ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Clock, Users, AlertTriangle, Calendar, ArrowLeft, Activity,
         ChevronRight, AlertCircle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { formatTime } from '../utils/formatTime';

// Types existants
interface DailyStats {
  Date: string;
  Name: string;
  Retard: string;
  Depart_Anticipe: string;
  Heures_Sup_50: string;
  Heures_Sup_100: string;
  Pause_Effective: string;
  Temps_Travail: string;
  Penalites: string;
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
  daily_records?: DailyStats[];
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
  message: string;
  absences?: Array<{ Name: string; Date: string }>;
  conges?: Array<{
    Employe: string;
    Debut: string;
    Fin: string;
    Type: string;
    Nombre_Jours: number;
  }>;
}

interface DashboardProps {
  analysisResult: AnalysisResult;
}
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color?: string;
    subValue?: string | null;
  }
  
  interface TableColumn {
    header: string;
    key: string;
  }
  
  interface DetailTableProps {
    data: any[];
    columns: TableColumn[];
  }
  

// Ajouter cette interface
interface GeneralViewProps {
  stats: DetailedStats;
  graphData: Array<{
    name: string;
    tempsTravail: string;  // Changé de number à string
    retards: string;      // Changé de number à string
    heuresSup: string;    // Changé de number à string
  }>;
}

 
 



  const getColorClasses = (color: string) => {
    const colorMap: Record<string, {bg: string; text: string}> = {
      blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-600'
      },
      red: {
        bg: 'bg-red-100',
        text: 'text-red-600'
      },
      green: {
        bg: 'bg-green-100',
        text: 'text-green-600'
      },
      purple: {
        bg: 'bg-purple-100',
        text: 'text-purple-600'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  
  // Les composants avec leurs props typées correctement
  const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "blue", 
    subValue = null 
  }) => {
    const colorClasses = getColorClasses(color);
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            {subValue && (
              <p className="text-sm text-gray-500 mt-1">{subValue}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses.bg}`}>
            <Icon className={`w-6 h-6 ${colorClasses.text}`} />
          </div>
        </div>
      </div>
    );
  };
  
  const DetailTable: React.FC<DetailTableProps> = ({ data, columns }) => (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {columns.map((column, colIdx) => (
                <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


const Dashboard: React.FC<DashboardProps> = ({ analysisResult }) => {
  const [activeView, setActiveView] = useState<'general' | 'detail' | 'employee'>('general');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const stats = analysisResult.detailed_stats;

  
  // Préparer les données pour les graphiques
  // À corriger dans graphData
  const graphData = useMemo(() => {
    return stats.stats_par_employe.map(emp => ({
      name: emp.nom,
      tempsTravail: emp.temps_travail,
      retards: emp.retards,
      heuresSup: emp.heures_sup
    }));
  }, [stats.stats_par_employe]);

  // Vue Générale
  const GeneralView: React.FC<GeneralViewProps> = ({ stats, graphData }) => (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <StatCard
    title="Temps Total Travaillé"
    value={formatTime(stats.total_temps_travail)}
    icon={Clock}
    subValue={`Moyenne: ${formatTime(stats.moyenne_temps_travail)}`}
  />
  <StatCard
    title="Total Retards"
    value={formatTime(stats.total_retards)}
    icon={AlertTriangle}
    color="red"
  />
  <StatCard
    title="Heures Sup 50%"
    value={formatTime(stats.total_heures_sup_50)}
    icon={TrendingUp}
    color="green"
  />
  <StatCard
    title="Heures Sup 100%"
    value={formatTime(stats.total_heures_sup_100)}
    icon={ArrowUpRight}
    color="purple"
  />
</div>
      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BarChart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
  <h3 className="text-lg font-semibold mb-4">Répartition du temps par employé</h3>
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={graphData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => formatTime(value?.toString())} />
        <Tooltip 
          formatter={(value) => formatTime(value?.toString())}
          labelFormatter={(label) => `Employé: ${label}`}
        />
        <Legend />
        <Bar 
          dataKey="tempsTravail" 
          name="Temps Travail" 
          fill="#3b82f6" 
        />
        <Bar 
          dataKey="retards" 
          name="Retards" 
          fill="#ef4444" 
        />
        <Bar 
          dataKey="heuresSup" 
          name="Heures Sup" 
          fill="#22c55e" 
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>


        {/* PieChart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
  <h3 className="text-lg font-semibold mb-4">Distribution des heures</h3>
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={[
            {
              name: "Temps Standard",
              value: stats.total_temps_travail
            },
            {
              name: "Heures Sup 50%",
              value: stats.total_heures_sup_50
            },
            {
              name: "Heures Sup 100%",
              value: stats.total_heures_sup_100
            }
          ].map(item => ({
            name: item.name,
            value: formatTime(item.value)
          }))}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          dataKey="value"
        >
          {['#3b82f6', '#22c55e', '#8b5cf6'].map((color, index) => (
            <Cell key={`cell-${index}`} fill={color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => value} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div>
      </div>
    </div>
  );
  
  // Vue Détaillée
  const DetailView = () => {
    const columns = [
      { header: "Employé", key: "nom" },
      { header: "Temps Travail", key: "temps_travail" },
      { header: "Retards", key: "retards" },
      { header: "Heures Sup", key: "heures_sup" },
      { header: "Jours Travaillés", key: "jours_travailles" },
      { header: "Actions", key: "actions" }
    ];
  
    const data = stats.stats_par_employe.map(emp => ({
      ...emp,
      temps_travail: formatTime(emp.temps_travail),
      retards: formatTime(emp.retards),
      heures_sup: formatTime(emp.heures_sup),
      actions: (
        <button
          onClick={() => {
            setSelectedEmployee(emp.nom);
            setActiveView('employee');
          }}
          className="text-blue-600 hover:text-blue-800"
        >
          Voir détails
        </button>
      )
    }));
  
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Détails par employé</h2>
        <DetailTable data={data} columns={columns} />
      </div>
    );
  };

  // Vue par Employé
  const EmployeeView = () => {
    if (!selectedEmployee) return null;

    const employeeStats = stats.stats_par_employe.find(
      emp => emp.nom === selectedEmployee
    );
    
    if (!employeeStats) return null;

    const dailyRecords = analysisResult.detailed_stats.daily_records?.filter(
      record => record.Name === selectedEmployee
    ) || [];

    const absences = analysisResult.absences?.filter(
      absence => absence.Name === selectedEmployee
    ) || [];

    const conges = analysisResult.conges?.filter(
      conge => conge.Employe === selectedEmployee
    ) || [];

    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Détails - {selectedEmployee}</h2>
          <button
            onClick={() => setActiveView('detail')}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </button>
        </div>

        {/* Statistiques de l'employé */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <StatCard
    title="Temps Total"
    value={formatTime(employeeStats.temps_travail)}
    icon={Clock}
  />
  <StatCard
    title="Retards"
    value={formatTime(employeeStats.retards)}
    icon={AlertTriangle}
    color="red"
  />
  <StatCard
    title="Heures Sup"
    value={formatTime(employeeStats.heures_sup)}
    icon={TrendingUp}
    color="green"
  />
  <StatCard
    title="Jours Travaillés"
    value={employeeStats.jours_travailles.toString()}
    icon={Calendar}
    color="blue"
  />
</div>

        {/* Détails quotidiens */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Détails Quotidiens</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retard</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Départ Anticipé</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heures Sup 50%</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heures Sup 100%</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pause</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temps Travail</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pénalités</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {dailyRecords.map((record, idx) => (
  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.Date}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatTime(record.Retard)}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{formatTime(record.Depart_Anticipe)}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{formatTime(record.Heures_Sup_50)}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{formatTime(record.Heures_Sup_100)}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(record.Pause_Effective)}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatTime(record.Temps_Travail)}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">{formatTime(record.Penalites)}</td>
  </tr>
))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Congés */}
        {conges.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Périodes de Congés</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Début</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jours</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conges.map((conge, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conge.Debut}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conge.Fin}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{conge.Type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conge.Nombre_Jours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Absences */}
        {absences.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Absences</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {absences.map((absence, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{absence.Date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        

     {/* Graphique d'évolution */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h3 className="text-lg font-semibold mb-4">Évolution du temps de travail</h3>
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      {(() => {
        const lineChartData = dailyRecords.map(record => ({
          Date: record.Date,
          Temps_Travail: record.Temps_Travail,
          Retard: record.Retard
        }));

        return (
          <LineChart data={lineChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Date" />
     <Tooltip 
  formatter={(value) => formatTime(value?.toString())}
  labelFormatter={(label) => `Employé: ${label}`}
/>
<YAxis 
  tickFormatter={formatTime}
  label={{ value: 'Heures', angle: -90, position: 'insideLeft' }}
/>
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Temps_Travail" 
              name="Temps de travail"
              stroke="#3b82f6" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="Retard" 
              name="Retards"
              stroke="#ef4444" 
              strokeWidth={2}
            />
          </LineChart>
        );
      })()}
    </ResponsiveContainer>
  </div>
</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex space-x-4 pb-4 border-b">
        <button
          className={`px-4 py-2 rounded-lg ${
            activeView === 'general' ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
          onClick={() => setActiveView('general')}
        >
          Vue Générale
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            activeView === 'detail' ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
          onClick={() => setActiveView('detail')}
        >
          Détails
        </button>
      </div>

      {/* Période */}
      <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
        <Calendar className="w-5 h-5 text-gray-500" />
        <span className="text-sm text-gray-500">
          Période : {analysisResult.analysis.date_range.start} au {analysisResult.analysis.date_range.end}
        </span>
      </div>

      {/* Contenu principal */}
      {activeView === 'general' && 
  <GeneralView 
    stats={stats} 
    graphData={graphData} 
  />
}
      {activeView === 'detail' && <DetailView />}
      {activeView === 'employee' && <EmployeeView />}
    </div>
  );
};

export default Dashboard;