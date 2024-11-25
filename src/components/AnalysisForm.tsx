import React, { useState } from 'react';
import { Calendar, Plus, X } from 'lucide-react';

interface RestDay {
  employeeName: string;
  days: number[];
}

interface Holiday {
  date: string;
}

interface LeavePeriod {
  employeeName: string;
  startDate: string;
  endDate: string;
  leaveType: string;  // Ajout de cette ligne
}

interface AnalysisFormProps {
  employees: string[];
  onSubmit: (data: {
    restDays: RestDay[];
    holidays: Holiday[];
    leavePeriods: LeavePeriod[];
    contractEnds?: {[key: string]: string};  // Nouveau champ
  }) => void;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Lundi' },
  { value: 1, label: 'Mardi' },
  { value: 2, label: 'Mercredi' },
  { value: 3, label: 'Jeudi' },
  { value: 4, label: 'Vendredi' },
  { value: 5, label: 'Samedi' },
  { value: 6, label: 'Dimanche' }
];

const AnalysisForm: React.FC<AnalysisFormProps> = ({ employees, onSubmit, onCancel }) => {
  const [restDays, setRestDays] = useState<RestDay[]>(
    employees.map(emp => ({ employeeName: emp, days: [4, 5] }))
  );
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leavePeriods, setLeavePeriods] = useState<LeavePeriod[]>([]);
  const [contractEnds, setContractEnds] = useState<{[key: string]: string}>({});

  const handleRestDayChange = (employeeName: string, day: number, checked: boolean) => {
    setRestDays(current =>
      current.map(rd => {
        if (rd.employeeName === employeeName) {
          const newDays = checked
            ? [...rd.days, day].sort()
            : rd.days.filter(d => d !== day);
          return { ...rd, days: newDays };
        }
        return rd;
      })
    );
  };

  const addHoliday = () => {
    setHolidays([...holidays, { date: '' }]);
  };

  const removeHoliday = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
  };

  const updateHoliday = (index: number, date: string) => {
    const newHolidays = [...holidays];
    newHolidays[index] = { date };
    setHolidays(newHolidays);
  };

  const addLeavePeriod = () => {
    setLeavePeriods([...leavePeriods, { 
        employeeName: employees[0], 
        startDate: '', 
        endDate: '', 
        leaveType: 'Congé annuel'  // Valeur par défaut
    }]);
};

  const removeLeavePeriod = (index: number) => {
    setLeavePeriods(leavePeriods.filter((_, i) => i !== index));
  };

  const updateLeavePeriod = (index: number, field: keyof LeavePeriod, value: string) => {
    const newLeavePeriods = [...leavePeriods];
    newLeavePeriods[index] = { ...newLeavePeriods[index], [field]: value };
    setLeavePeriods(newLeavePeriods);
  };

  const handleSubmit = () => {
    onSubmit({
      restDays,
      holidays,
      leavePeriods,
      contractEnds
    });
  };

  return (
    <div className="space-y-8 p-6">
      {/* Jours de repos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Jours de repos par employé</h3>
        <div className="space-y-4">
          {employees.map(employee => (
            <div key={employee} className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">{employee}</p>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={restDays.find(rd => rd.employeeName === employee)?.days.includes(day.value) ?? false}
                      onChange={(e) => handleRestDayChange(employee, day.value, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
  <h3 className="text-lg font-semibold">Fin de contrat</h3>
  {employees.map(emp => (
    <div key={emp} className="flex items-center gap-2 p-2">
      <input
        type="checkbox"
        onChange={(e) => {
          const newContractEnds = {...contractEnds};
          if (e.target.checked) {
            newContractEnds[emp] = '';
          } else {
            delete newContractEnds[emp];
          }
          setContractEnds(newContractEnds);
        }}
        checked={emp in contractEnds}
      />
      <span>{emp}</span>
      {emp in contractEnds && (
        <input
          type="date"
          value={contractEnds[emp]}
          onChange={(e) => {
            setContractEnds({
              ...contractEnds,
              [emp]: e.target.value
            });
          }}
          className="border rounded p-2"
        />
      )}
    </div>
  ))}
</div>

      {/* Jours fériés */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Jours fériés</h3>
        <div className="space-y-2">
          {holidays.map((holiday, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="date"
                value={holiday.date}
                onChange={(e) => updateHoliday(index, e.target.value)}
                className="border rounded p-2"
              />
              <button
                onClick={() => removeHoliday(index)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addHoliday}
            className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un jour férié
          </button>
        </div>
      </div>

      {/* Périodes de congés */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Périodes de congés</h3>
        <div className="space-y-2">
          {leavePeriods.map((period, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-50 p-3 rounded">
              <select
                value={period.employeeName}
                onChange={(e) => updateLeavePeriod(index, 'employeeName', e.target.value)}
                className="border rounded p-2"
              >
                {employees.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
              <input
                type="date"
                value={period.startDate}
                onChange={(e) => updateLeavePeriod(index, 'startDate', e.target.value)}
                className="border rounded p-2"
                placeholder="Date début"
              />
              <input
                type="date"
                value={period.endDate}
                onChange={(e) => updateLeavePeriod(index, 'endDate', e.target.value)}
                className="border rounded p-2"
                placeholder="Date fin"
              />
              <select
                value={period.leaveType}
                onChange={(e) => updateLeavePeriod(index, 'leaveType', e.target.value)}
                className="border rounded p-2"
              >
                <option value="Congé annuel">Congé annuel</option>
                <option value="Congé maladie">Congé maladie</option>
                <option value="Congé exceptionnel">Congé exceptionnel</option>
                <option value="Congé sans solde">Congé sans solde</option>
                <option value="Congé maternité/paternité">Congé maternité/paternité</option>
              </select>
              <button
                onClick={() => removeLeavePeriod(index)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addLeavePeriod}
            className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une période de congé
          </button>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-4 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Lancer l'analyse
        </button>
      </div>
    </div>
  );
};

export default AnalysisForm;