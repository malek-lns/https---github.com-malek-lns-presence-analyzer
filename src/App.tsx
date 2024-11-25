import React, { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Download } from 'lucide-react';
import AnalysisForm from './components/AnalysisForm';
import Dashboard from './components/Dashboard1';


interface Holiday {
  date: string;
}

interface RestDay {
  employeeName: string;
  days: number[];
}

interface LeavePeriod {
  employeeName: string;
  startDate: string;
  endDate: string;
}

interface DetailedStats {
  total_retards: string;
  total_heures_sup_50: string;
  total_heures_sup_100: string;
  total_temps_travail: string;
  moyenne_temps_travail: string;
  stats_par_employe: Array<{
    nom: string;
    retards: string;
    heures_sup: string;
    temps_travail: string;
    jours_travailles: number;
  }>;
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
}


function App() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showAnalysisForm, setShowAnalysisForm] = useState(false);
  const [employeesList, setEmployeesList] = useState<string[]>([]);
  const [showReportEditor, setShowReportEditor] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('');
      setAnalysisResult(null);
      
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await fetch('http://127.0.0.1:8000/employees', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setEmployeesList(data.employees);
          setShowAnalysisForm(true);
        } else {
          setUploadStatus('Erreur lors de la lecture du fichier');
        }
      } catch (error) {
        console.error('Erreur:', error);
        setUploadStatus('Erreur de connexion');
      }
    }
  };

  const handleAnalysisSubmit = async (data: {
    restDays: RestDay[];
    holidays: Holiday[];
    leavePeriods: LeavePeriod[];
  }) => {
    if (!file) return;

    try {
      setIsLoading(true);
      setUploadStatus('Analyse en cours...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('params', JSON.stringify(data));

      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setAnalysisResult(result);
        setUploadStatus('Fichier analysé avec succès !');
        setShowAnalysisForm(false);
      } else {
        setUploadStatus('Erreur: ' + result.detail);
      }
    } catch (error) {
      setUploadStatus('Erreur de connexion au serveur');
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!analysisResult?.report_id) return;
    
    try {
      setIsDownloading(true);
      const response = await fetch(`http://127.0.0.1:8000/download/${analysisResult.report_id}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_presence_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setUploadStatus('Erreur lors du téléchargement du rapport');
      console.error('Erreur:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* En-tête principal */}
  <div className="flex justify-between items-center mb-8">
    <h1 className="text-3xl font-bold">Analyseur de Présence</h1>
    <div className="flex space-x-2">
      {analysisResult && (
        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          {isDownloading ? 'Téléchargement...' : 'Télécharger le rapport'}
        </button>
      )}
      <button 
        onClick={() => setShowReportEditor(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
      >
        Modifier un rapport
      </button>
    </div>
  </div>

  


        {/* Zone principale */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Zone d'import */}
          {!showAnalysisForm && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".xls,.xlsx"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600">
                  Glissez votre fichier Excel ou cliquez pour sélectionner
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Formats acceptés : .xls, .xlsx
                </p>
              </label>
            </div>
          )}

          {/* Affichage du fichier sélectionné */}
          {file && !showAnalysisForm && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-500 mr-2" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire d'analyse */}
          {showAnalysisForm && (
            <AnalysisForm
              employees={employeesList}
              onSubmit={handleAnalysisSubmit}
              onCancel={() => {
                setShowAnalysisForm(false);
                setFile(null);
              }}
            />
          )}

          {/* Status de l'upload */}
          {uploadStatus && (
            <div className={`mt-4 p-4 rounded-lg ${
              uploadStatus.includes('succès') 
                ? 'bg-green-50' 
                : uploadStatus.includes('Erreur') 
                  ? 'bg-red-50'
                  : 'bg-blue-50'
            }`}>
              <div className="flex items-center">
                {uploadStatus.includes('succès') ? (
                  <Check className="w-5 h-5 text-green-500 mr-2" />
                ) : uploadStatus.includes('Erreur') ? (
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                ) : null}
                <p className={`${
                  uploadStatus.includes('succès') 
                    ? 'text-green-700' 
                    : uploadStatus.includes('Erreur')
                      ? 'text-red-700'
                      : 'text-blue-700'
                }`}>
                  {uploadStatus}
                </p>
              </div>
            </div>
          )}

          {/* Résultats de l'analyse */}
          {analysisResult && analysisResult.detailed_stats && (
            
            <div className="mt-6">
    <Dashboard analysisResult={analysisResult} />
  </div>
              


              
                        
               
          )}
        </div>
      </div>
    </div>
  );
}

export default App;