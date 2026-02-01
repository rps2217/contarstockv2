
import React, { useState, useCallback } from 'react';
import { AppSettings, AppSheetConfig } from '../types';
import { bootstrapConfigById, callGas } from '../services/gasService';
import { SoundFX } from '../services/audio';

export const useCloudConfig = (settings: AppSettings, updateSetting: (k: keyof AppSettings, v: any) => void) => {
    const [ssIdInput, setSsIdInput] = useState('');
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
    const [isScanningQR, setIsScanningQR] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);

    const config = settings.appSheetConfig || {
        appId: '',
        accessKey: '',
        countsTableName: 'CONTEOS',
        consolidatedTableName: 'CONSOLIDADO',
        productsTableName: 'PRODUCTOS',
        receptionTableName: 'RECEPCION_BULTOS',
        gasWebAppUrl: ''
    };

    const generateConfigQR = useCallback(() => {
        const payload = { v: "1.0", type: "logicount_config", data: config };
        const encoded = btoa(JSON.stringify(payload));
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(encoded)}`;
    }, [config]);

    const handleQRScanSuccess = (rawCode: string) => {
        try {
            const decoded = atob(rawCode);
            const payload = JSON.parse(decoded);
            if (payload.type === 'logicount_config' && payload.data) {
                updateSetting('appSheetConfig', payload.data);
                SoundFX.play('success');
                setIsScanningQR(false);
                alert("✅ Configuración clonada exitosamente vía QR.");
            } else {
                throw new Error("QR Inválido");
            }
        } catch (e) {
            SoundFX.play('error');
            alert("❌ QR no reconocido.");
        }
    };

    const handleBootstrap = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!ssIdInput) return;
        
        setIsBootstrapping(true);
        try {
            const newConfig = await bootstrapConfigById(ssIdInput);
            updateSetting('appSheetConfig', newConfig);
            SoundFX.play('success');
            setSsIdInput('');
            alert("✅ Vínculo Maestro Exitoso.");
        } catch (err: any) {
            SoundFX.play('error');
            alert(`Error: ${err.message}`);
        } finally {
            setIsBootstrapping(false);
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        try {
            const res = await callGas('ping', {});
            if (res.success) {
                setTestStatus('ok');
                SoundFX.play('success');
            } else throw new Error();
        } catch (e) {
            setTestStatus('fail');
            SoundFX.play('error');
        }
        setTimeout(() => setTestStatus('idle'), 3000);
    };

    const handleUrlChange = (val: string) => {
        updateSetting('appSheetConfig', { ...config, gasWebAppUrl: val });
    };

    return {
        state: { 
            ssIdInput, setSsIdInput, 
            isBootstrapping, testStatus, 
            isScanningQR, setIsScanningQR,
            showQRModal, setShowQRModal,
            config 
        },
        actions: { 
            handleBootstrap, 
            handleTestConnection, 
            handleQRScanSuccess, 
            generateConfigQR,
            handleUrlChange
        }
    };
};
