
import React, { useState, useRef } from 'react';
import * as productService from '../services/productService';
import { SoundFX } from '../services/audio';

export type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

export const useProductImporter = (onComplete: (count: number) => void) => {
 const [status, setStatus] = useState<ImportStatus>('idle');
 const [count, setCount] = useState(0);
 const [error, setError] = useState('');
 const [sheetUrl, setSheetUrl] = useState('');

 const reset = () => {
 setStatus('idle');
 setCount(0);
 setError('');
 setSheetUrl('');
 };

 const handleSuccess = (importedCount: number) => {
 setCount(importedCount);
 setStatus('success');
 SoundFX.play('success');
 onComplete(importedCount);
 };

 const handleError = (msg: string) => {
 setError(msg);
 setStatus('error');
 SoundFX.play('error');
 };

 const importFromSheet = async (e?: React.FormEvent) => {
 e?.preventDefault();
 if (!sheetUrl) return;

 setStatus('loading');
 setError('');

 try {
 const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
 if (!idMatch) throw new Error("URL de Google Sheets no válida.");

 const sheetId = idMatch[1];
 const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

 const response = await fetch(csvUrl);
 if (!response.ok) throw new Error("Acceso denegado. Verifique que la hoja sea 'Pública para ver'.");

 const csvText = await response.text();
 const resultCount = await productService.bulkImportProducts(csvText);
 
 handleSuccess(resultCount);
 } catch (err: any) {
 handleError(err.message || "Error de conexión con Google.");
 }
 };

 const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setStatus('loading');
 setError('');

 const reader = new FileReader();
 reader.onload = async (event) => {
 try {
 const csvText = event.target?.result as string;
 const resultCount = await productService.bulkImportProducts(csvText);
 handleSuccess(resultCount);
 } catch (err: any) {
 handleError("El archivo CSV tiene un formato inválido.");
 }
 };
 reader.onerror = () => handleError("No se pudo leer el archivo local.");
 reader.readAsText(file);
 };

 return {
 state: { status, count, error, sheetUrl },
 actions: { setSheetUrl, importFromSheet, importFromCSV, reset }
 };
};
