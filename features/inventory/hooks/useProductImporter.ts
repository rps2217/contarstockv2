
import React, { useState } from 'react';
import * as productService from '../../../services/productService';
import { SoundFX } from '../../../services/audio';

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
 actions: { setSheetUrl, importFromCSV, reset }
 };
};
