import React, { useState } from 'react';
import { Edit2, Save } from 'lucide-react';

interface DailyData {
  Date: string;
  Name: string;
  Retard: string;
  Heures_Sup_50: string;
  Heures_Sup_100: string;
  Temps_Travail: string;
}

interface EmployeeStats {
  nom: string;
  retards: string;
  heures_sup: string;
  temps_travail: string;
  jours_travailles: number;
}

interface Modification {
  date: string;
  field: string;
  oldValue: string;
  newValue: string;
  employeeName: string;
  timestamp: string;
}

interface AdminEditorProps {
  employeeData: {
    stats: EmployeeStats[];
    daily: DailyData[];
  };
  onSaveChanges: (modifications: Modification[]) => void;
}

const AdminEditor: React.FC<AdminEditorProps> = ({ employeeData, onSaveChanges }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [editingRow, setEditingRow] = useState<{ date: string; field: string } | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // Fonctions utilitaires
  const formatTimeValue = (value: string) => {
    if (!value) return "00:00";
    const [hours, minutes] = value.split(':').map(num => num.padStart(2, '0'));
    return `${hours}:${minutes}`;
  };

  const handleEdit = (date: string, field: string, currentValue: string) => {
    setEditingRow({ date, field });
    setEditedValues({ ...editedValues, [`${date}-${field}`]: currentValue });
  };

  const validateTimeFormat = (value: string): boolean => {
    const timeRegex = /^([0-9]{1,2}):([0-9]{2})$/;
    if (!timeRegex.test(value)) return false;
    const [hours, minutes] = value.split(':').map(Number);
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
  };

  const handleSave = (date: string, field: string, employeeName: string) => {
    const newValue = editedValues[`${date}-${field}`];
    if (!newValue) return;

    if (['Retard', 'Heures_Sup_50', 'Heures_Sup_100', 'Temps_Travail'].includes(field)) {
      if (!validateTimeFormat(newValue)) {
        alert('Format de temps invalide. Utilisez le format HH:MM');
        return;
      }
    }

    const dailyData = employeeData.daily.find(
      d => d.Date === date && d.Name === employeeName
    );

    if (dailyData) {
      const oldValue = dailyData[field as keyof DailyData] as string;
      
      if (oldValue !== newValue) {
        const modification: Modification = {
          date,
          field,
          oldValue,
          newValue: formatTimeValue(newValue),
          employeeName,
          timestamp: new Date().toISOString()
        };

        setModifications([...modifications, modification]);
      }
    }

    setEditingRow(null);
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditedValues({});
  };

  const handleSaveAll = () => {
    if (modifications.length > 0) {
      onSaveChanges(modifications);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sélection de l'employé */}
      <div className="mb-4">
        <select 
          className="w-full p-2 border rounded"
          onChange={(e) => setSelectedEmployee(e.target.value)}
          value={selectedEmployee || ""}
        >
          <option value="">Sélectionner un employé</option>
          {employeeData.stats.map(emp => (
            <option key={emp.nom} value={emp.nom}>
              {emp.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Résumé des modifications */}
      {modifications.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h4 className="font-semibold text-blue-700 mb-2">
            Modifications en attente: {modifications.length}
          </h4>
          <div className="max-h-40 overflow-y-auto">
            {modifications.map((mod, idx) => (
              <div key={idx} className="text-sm text-blue-600 mb-1">
                {mod.date} - {mod.field}: {mod.oldValue} → {mod.newValue}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedEmployee && (
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">
              Données de {selectedEmployee}
            </h2>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border text-left">Date</th>
                    <th className="p-2 border text-left">Retards</th>
                    <th className="p-2 border text-left">Heures Sup 50%</th>
                    <th className="p-2 border text-left">Heures Sup 100%</th>
                    <th className="p-2 border text-left">Temps Travail</th>
                    <th className="p-2 border text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeData.daily
                    .filter(row => row.Name === selectedEmployee)
                    .map((row) => (
                      <tr key={row.Date}>
                        <td className="p-2 border">{row.Date}</td>
                        {['Retard', 'Heures_Sup_50', 'Heures_Sup_100', 'Temps_Travail'].map((field) => (
                          <td key={field} className="p-2 border">
                            {editingRow?.date === row.Date && editingRow?.field === field ? (
                              <input
                                type="text"
                                className="w-full p-1 border rounded"
                                value={editedValues[`${row.Date}-${field}`] || row[field as keyof DailyData]}
                                onChange={(e) => setEditedValues({
                                  ...editedValues,
                                  [`${row.Date}-${field}`]: e.target.value
                                })}
                                placeholder="HH:MM"
                              />
                            ) : (
                              row[field as keyof DailyData]
                            )}
                          </td>
                        ))}
                        <td className="p-2 border">
                          {editingRow?.date === row.Date ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSave(row.Date, editingRow.field, row.Name)}
                                className="p-1 text-green-600 hover:text-green-800"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-1 text-red-600 hover:text-red-800"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(row.Date, 'Retard', row.Retard)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Boutons de sauvegarde */}
      {modifications.length > 0 && (
        <div className="flex justify-end space-x-4 mt-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
          >
            Annuler les modifications
          </button>
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sauvegarder toutes les modifications
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminEditor;