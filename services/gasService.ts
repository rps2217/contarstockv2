
import { logger } from './logger';
import { getSettings, saveSettings } from './settings';
import { AppSheetConfig } from '../types';
import { cloudApi } from './cloud/apiClient';

/**
 * Normalización de cabeceras ultra-flexible.
 * Borra espacios, guiones y convierte a mayúsculas.
 */
const superNormalize = (s: string) => 
    String(s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * CONFIGURACIÓN AUTOMÁTICA POR URL (Recomendado)
 * Usa el Script como puente para leer el Excel, eliminando problemas de privacidad.
 */
export const bootstrapByUrl = async (url: string): Promise<AppSheetConfig> => {
    if (!url.startsWith('https://script.google.com')) {
        throw new Error("La URL debe comenzar con https://script.google.com...");
    }

    // 1. Guardar temporalmente la URL para que el apiClient pueda usarla
    const currentSettings = getSettings();
    const tempSettings = {
        ...currentSettings,
        appSheetConfig: { ...currentSettings.appSheetConfig, gasWebAppUrl: url } as AppSheetConfig
    };
    // No persistimos aún, solo en memoria para la prueba
    
    try {
        // 2. Pedirle al script que lea la configuración desde la pestaña CONFIG_SISTEMA
        // Usamos una llamada cruda al fetch para no depender del estado global de la app aún
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action: 'fetch_rows', tableName: 'CONFIG_SISTEMA' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!response.ok) throw new Error("El script no respondió. Revise la implementación.");
        
        const res = await response.json();
        if (!res.success || !res.rows || res.rows.length === 0) {
            throw new Error("No se pudo leer 'CONFIG_SISTEMA'. Revise que la pestaña exista en su Excel.");
        }

        const master = res.rows[0];
        const masterKeys = Object.keys(master);

        const findVal = (searchKeys: string[]) => {
            const normalizedSearch = searchKeys.map(superNormalize);
            const foundKey = masterKeys.find(k => normalizedSearch.includes(superNormalize(k)));
            return foundKey ? String(master[foundKey]).trim() : '';
        };

        // Construir config final
        const config: AppSheetConfig = {
            gasWebAppUrl: url,
            appId: findVal(['APP_ID', 'APPLICATION_ID']),
            accessKey: findVal(['ACCESS_KEY', 'KEY']),
            countsTableName: findVal(['TABLE_LOGS', 'TABLA_CONTEOS', 'CONTEOS']) || 'CONTEOS',
            consolidatedTableName: findVal(['TABLE_CONSOLIDADO', 'CONSOLIDADO']) || 'CONSOLIDADO',
            productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']) || 'PRODUCTOS',
            receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION']) || 'RECEPCION_BULTOS',
            ordersTableName: findVal(['TABLE_PEDIDOS', 'PEDIDOS']) || 'PEDIDOS'
        };

        if (!config.appId) throw new Error("No se encontró la columna APP_ID en el Excel.");

        return config;
    } catch (err: any) {
        logger.error('BOOTSTRAP_URL_FAIL', err.message);
        throw err;
    }
};

export const fetchSystemConfig = async (): Promise<Partial<AppSheetConfig>> => {
    const config = getSettings().appSheetConfig;
    if (!config?.gasWebAppUrl) return {};

    try {
        const res = await cloudApi.post('fetch_rows', { tableName: 'CONFIG_SISTEMA' });
        if (!res.success || !res.rows || res.rows.length === 0) return {};

        const master = res.rows[0];
        const masterKeys = Object.keys(master);
        
        const findVal = (searchKeys: string[]) => {
            const normalizedSearch = searchKeys.map(superNormalize);
            const foundKey = masterKeys.find(k => normalizedSearch.includes(superNormalize(k)));
            return foundKey ? String(master[foundKey]).trim() : '';
        };

        return {
            appId: findVal(['APP_ID', 'APPID', 'APPLICATION_ID']),
            accessKey: findVal(['ACCESS_KEY', 'ACCESSKEY', 'KEY']),
            countsTableName: findVal(['TABLE_LOGS', 'TABLA_CONTEOS', 'CONTEOS']),
            consolidatedTableName: findVal(['TABLE_CONSOLIDADO', 'TABLA_RESUMEN', 'CONSOLIDADO']),
            productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']),
            receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION'])
        };
    } catch (e) {
        return {};
    }
};

export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    return cloudApi.post(action, payload, compress);
};

export const fetchFromGas = async (tableName: string): Promise<any[]> => {
    const res = await cloudApi.fetchTable(tableName);
    return res.rows || [];
};

export const bootstrapConfigById = async (id: string): Promise<AppSheetConfig> => {
    // Mantener por compatibilidad pero desalentar su uso
    throw new Error("Método obsoleto. Use la URL del Script para mayor seguridad.");
};
