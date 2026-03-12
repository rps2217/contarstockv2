import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as matcher from '../services/matcher';
import * as productService from '../services/productService';
import { aggregateScans } from '../services/aggregator';
import { MatchResult, AliasSuggestion } from '../types';

export const useConciliator = () => {
 const [step, setStep] = useState<'upload' | 'select' | 'results'>('upload');
 const [isImporting, setIsImporting] = useState(false);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [analysisProgress, setAnalysisProgress] = useState('');
 const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
 const [matches, setMatches] = useState<MatchResult[]>([]);
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
 setStep('select');
 } catch (err: any) { alert(`Error: ${err.message}`); }
 finally { setIsImporting(false); }
 };

 const runAnalysis = useCallback(async (sessionIds: string[]) => {
 setSelectedSessionIds(sessionIds);
 setIsAnalyzing(true);
 setAnalysisProgress(`Analizando contenido...`);

 try {
 const scans = await db.scans.where('sessionId').anyOf(sessionIds).toArray();
 const physicalItems = await aggregateScans(scans);
 const expectedOrders = await db.expectedOrders.toArray();

 try {
 if (!workerRef.current) {
 workerRef.current = new Worker(new URL('../workers/detective.worker.ts', import.meta.url), { type: 'module' });
 }
 workerRef.current.postMessage({ physicalItems, expectedOrders });
 workerRef.current.onmessage = (e) => {
 const { success, results, error } = e.data;
 if (success) {
 setMatches(results);
 setSelectedMatch(results[0]);
 setStep('results');
 } else { alert(error); }
 setIsAnalyzing(false);
 };
 workerRef.current.onerror = () => {
 setIsAnalyzing(false);
 alert("El motor de análisis falló en este navegador.");
 };
 } catch (e) {
 setIsAnalyzing(false);
 alert("Navegador incompatible con el motor de Detective.");
 }
 } catch (err: any) { 
 setIsAnalyzing(false); 
 }
 }, []);

 const linkAlias = async (alias: AliasSuggestion) => {
 try {
 await productService.createProductAlias(alias.physicalBarcode, alias.expectedBarcode, alias.expectedName);
 setLinkedAliases(prev => new Set(prev).add(alias.physicalBarcode));
 } catch (e: any) { alert(e.message); }
 };

 const assignOrder = async (onSuccess: () => void) => {
 if (!selectedMatch) return;
 const newErp = selectedMatch.expectedOrder.internalId;
 const score = selectedMatch.matchScore;
 const auditStatus = score > 98 ? 'verified' : (score > 60 ? 'warning' : 'failed');
 try {
 await Promise.all(selectedSessionIds.map(id => 
 db.sessions.update(id, { erpOrder: newErp, auditStatus, auditScore: score, auditTimestamp: Date.now() })
 ));
 onSuccess();
 } catch (e) { alert("Error al guardar."); }
 };

 return {
 state: { step, isImporting, isAnalyzing, analysisProgress, matches, selectedMatch, linkedAliases, sessions, expectedOrdersCount, selectedSessionIds },
 actions: { setStep, handleFileUpload, runAnalysis, linkAlias, assignOrder, setSelectedMatch }
 };
};