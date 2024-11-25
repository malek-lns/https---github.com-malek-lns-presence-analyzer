import React, { useState } from 'react';
import { Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
         BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface DailyRecord {
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
  daily_records: DailyRecord[];
}

interface AnalysisResult {
  detailed_stats: DetailedStats;
}

interface DashboardProps {
  analysisResult: AnalysisResult;
}

const StatCard = ({ title, value, icon: Icon, color }: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) => (
  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={`p-3 rounded-full bg-${color}-100`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ analysisResult }) => {
  const [activeView, setActiveView] = useState<'general' | 'detail'>('general');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeStats | null>(null);

  const stats = analysisResult.detailed_stats;
  const employees = stats.stats_par_employe;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex space-x-4 pb-4 border-b">
        <button
          onClick={() => setActiveView('general')}
          className={`px-4 py-2 rounded-lg ${
            activeView === 'general' ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          Vue Générale
        </button>
        <button
          onClick={() => setActiveView('detail')}
          className={`px-4 py-2 rounded-lg ${
            activeView === 'detail' ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          Vue Détaillée
        </button>
      </div>

      {activeView === 'general' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Temps Total Travaillé"
              value={stats.total_temps_travail}
              icon={Clock}
              color="blue"
            />
            <StatCard
              title="Total Retards"
              value={stats.total_retards}
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              title="Heures Sup 50%"
              value={stats.total_heures_sup_50}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              title="Total Employés"
              value={employees.length}
              icon={Users}
              color="purple"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-bold mb-4">Temps de Travail par Employé</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employees}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nom" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="temps_travail" fill="#3b82f6" name="Temps de travail" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */} 
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-bold mb-4">Distribution des Heures</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>*/
          </div>
        </div>
      )}

      {activeView === 'detail' && (
        <div className="space-y-6">
          {/* Employee Selector */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {employees.map((emp) => (
              <button
                key={emp.nom}
                onClick={() => setSelectedEmployee(emp)}
                className={`px-4 py-2 rounded-lg ${
                  selectedEmployee?.nom === emp.nom ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                {emp.nom}
              </button>
            ))}
          </div>

          {selectedEmployee && (
            <div className="space-y-6">
              {/* Employee Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Temps Travail"
                  value={selectedEmployee.temps_travail}
                  icon={Clock}
                  color="blue"
                />
                <StatCard
                  title="Retards"
                  value={selectedEmployee.retards}
                  icon={AlertTriangle}
                  color="red"
                />
                <StatCard
                  title="Heures Sup"
                  value={selectedEmployee.heures_sup}
                  icon={TrendingUp}
                  color="green"
                />
                <StatCard
                  title="Jours Travaillés"
                  value={selectedEmployee.jours_travailles}
                  icon={Users}
                  color="purple"
                />
              </div>

              {/* Daily Records */}
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4">Détails Quotidiens</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retard</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures Sup 50%</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures Sup 100%</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temps Travail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.daily_records
                          .filter((record) => record.Name === selectedEmployee.nom)
                          .map((record, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4">{record.Date}</td>
                              <td className="px-6 py-4">{record.Retard}</td>
                              <td className="px-6 py-4">{record.Heures_Sup_50}</td>
                              <td className="px-6 py-4">{record.Heures_Sup_100}</td>
                              <td className="px-6 py-4">{record.Temps_Travail}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;