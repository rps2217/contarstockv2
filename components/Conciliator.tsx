
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useConciliator } from '../hooks/useConciliator';
import { exportDiscrepancyPDF } from '../services/export';

// Atómicos
import { UploadStep } from './conciliator/UploadStep';
import { SessionPickerStep } from './conciliator/SessionPickerStep';
import { AnalysisResults } from './conciliator/AnalysisResults';

export const Conciliator: React.FC = () => {
    const navigate = useNavigate();
    const { state, actions } = useConciliator();

    return (
        <div className="min-h-[calc(100vh-80px)] w-full">
            {state.step === 'upload' && (
                <UploadStep 
                    onBack={() => navigate('/dashboard')} 
                    onFileUpload={actions.handleFileUpload} 
                    onSkip={() => actions.setStep('select')} 
                    isImporting={state.isImporting} 
                    expectedOrdersCount={state.expectedOrdersCount} 
                />
            )}
            
            {state.step === 'select' && (
                <SessionPickerStep 
                    sessions={state.sessions || []} 
                    onBack={() => actions.setStep('upload')} 
                    onSelectMultiple={actions.runAnalysis} 
                    isAnalyzing={state.isAnalyzing} 
                    progress={state.analysisProgress} 
                />
            )}
            
            {state.step === 'results' && state.selectedMatch && (
                <AnalysisResults 
                    match={state.selectedMatch} 
                    sessionLabel={state.selectedSessionIds.length > 1 ? `${state.selectedSessionIds.length} Bultos` : (state.sessions?.find(s => s.id === state.selectedSessionIds[0])?.logisticsLabel || '')} 
                    onBack={() => actions.setStep('select')} 
                    onExportPDF={() => exportDiscrepancyPDF(state.selectedMatch!, "Análisis Detective")} 
                    onAssign={() => actions.assignOrder(() => navigate('/dashboard'))} 
                    onLinkAlias={actions.linkAlias} 
                    linkedAliases={state.linkedAliases} 
                />
            )}
        </div>
    );
};
