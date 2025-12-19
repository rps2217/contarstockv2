
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as matcher from '../services/matcher';
import * as productService from '../services/productService';
import { MatchResult, AliasSuggestion } from '../types';
import { exportDiscrepancyPDF } from '../services/export';
import { aggregateScans } from '../services/aggregator';

// Atómicos
import { UploadStep } from './conciliator/UploadStep';
import { SessionPickerStep } from './conciliator/SessionPickerStep';
import { AnalysisResults } from './conciliator/AnalysisResults';

export const Conciliator: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'upload' | 'select' | 'results'>('upload');
    const [isImporting, setIsImporting] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState('');
    const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
    const [linkedAliases, setLinkedAliases] = useState<Set<string>>(new Set());

    const workerRef = useRef<Worker | null>(null);
    const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray(), [], []);
    const expectedOrdersCount = useLiveQuery(() => db.expectedOrders.count(), [], 0);

    useEffect(() => {
        return () => { if (workerRef.current) workerRef.current.terminate(); };
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        try {
            const count = await matcher.importExpectedOrders(file);
            alert(`Matriz lista: ${count} pedidos cargados.`);
            setStep('select');
        } catch (err: any) { alert(`Error: ${err.message}`); }
        finally { setIsImporting(false); }
    };

    const handleRunAnalysis = async (sessionId: string) => {
        setSelectedSessionId(sessionId);
        setIsAnalyzing(true);
        setAnalysisProgress('Preparando datos físicos...');
        setLinkedAliases(new Set()); 

        try {
            const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
            const physicalItems = await aggregateScans(scans);
            const expectedOrders = await db.expectedOrders.toArray();
            if (expectedOrders.length === 0) throw new Error("No hay matriz cargada.");

            if (!workerRef.current) {
                workerRef.current = new Worker(new URL('../workers/detective.worker.ts', import.meta.url), { type: 'module' });
            }

            workerRef.current.postMessage({ physicalItems, expectedOrders });
            workerRef.current.onmessage = (e) => {
                const { success, results, error } = e.data;
                if (error) { alert("Error: " + error); setIsAnalyzing(false); return; }
                if (success) {
                    if (results.length === 0) { alert("Sin coincidencias."); setIsAnalyzing(false); return; }
                    setMatches(results);
                    setSelectedMatch(results[0]);
                    setStep('results');
                    setIsAnalyzing(false);
                }
            };
        } catch (err: any) { alert("Error crítico: " + err.message); setIsAnalyzing(false); }
    };

    const handleAcceptAlias = async (alias: AliasSuggestion) => {
        try {
            await productService.createProductAlias(alias.physicalBarcode, alias.expectedBarcode, alias.expectedName);
            setLinkedAliases(prev => new Set(prev).add(alias.physicalBarcode));
            if (navigator.vibrate) navigator.vibrate(50);
        } catch (e: any) { alert(`Error: ${e.message}`); }
    };

    const handleAssignOrder = async () => {
        if (!selectedMatch || !selectedSessionId) return;
        const newErp = selectedMatch.expectedOrder.internalId;
        const score = selectedMatch.matchScore;
        let auditStatus: 'verified' | 'warning' | 'failed' = score > 98 ? 'verified' : (score > 60 ? 'warning' : 'failed');
        
        if (!confirm(`¿Vincular este conteo a la Guía "${newErp}"?`)) return;

        try {
            await db.sessions.update(selectedSessionId, { 
                erpOrder: newErp,
                auditStatus: auditStatus,
                auditScore: parseFloat(score.toFixed(1)),
                auditTimestamp: Date.now()
            });
            alert("✅ Vinculación Exitosa.");
            navigate('/dashboard'); 
        } catch (e) { alert("Error al guardar."); }
    };

    if (step === 'upload') return <UploadStep onBack={() => navigate('/dashboard')} onFileUpload={handleFileUpload} onSkip={() => setStep('select')} isImporting={isImporting} expectedOrdersCount={expectedOrdersCount} />;
    
    if (step === 'select') return <SessionPickerStep sessions={sessions || []} onBack={() => setStep('upload')} onSelect={handleRunAnalysis} isAnalyzing={isAnalyzing} progress={analysisProgress} />;
    
    if (step === 'results' && selectedMatch) return <AnalysisResults match={selectedMatch} sessionLabel={sessions?.find(s => s.id === selectedSessionId)?.logisticsLabel || ''} onBack={() => setStep('select')} onExportPDF={() => exportDiscrepancyPDF(selectedMatch, '')} onAssign={handleAssignOrder} onLinkAlias={handleAcceptAlias} linkedAliases={linkedAliases} />;

    return null;
};
