import { logger } from './logger';

/**
 * Servicio de Puente para Google Apps Script (GAS)
 * Permite realizar operaciones de escritura masiva y lógica server-side.
 */
export const sendToGas = async (url: string, payload: any): Promise<{ success: boolean, count?: number, error?: string }> => {
    try {
        // Usamos 'text/plain' para evitar el preflight de CORS que a veces falla en Apps Script
        // desde navegadores móviles o redes corporativas.
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            },
            body: JSON.stringify(payload)
        });

        // Apps Script responde con redirecciones (302) que el navegador sigue automáticamente.
        const rawText = await response.text();
        
        try {
            // Intentamos parsear la respuesta.
            const result = JSON.parse(rawText);
            return result;
        } catch (parseError) {
            // Diagnóstico de errores comunes de Google
            if (rawText.includes('Google Drive - Virus scan warning')) {
                throw new Error("El archivo es demasiado grande para el escaneo de seguridad de Google.");
            }
            if (rawText.includes('script.google.com') || rawText.includes('<!DOCTYPE html>')) {
                throw new Error("Error de permisos: Asegúrese de que la Web App esté publicada como 'Anyone' (Cualquier persona).");
            }
            
            logger.error('GAS_BRIDGE', "Respuesta no JSON recibida", rawText.substring(0, 200));
            throw new Error("La Web App de Google no respondió en el formato esperado.");
        }

    } catch (error: any) {
        logger.error('GAS_BRIDGE', `Fallo en comunicación: ${error.message}`);
        return { success: false, error: error.message };
    }
};