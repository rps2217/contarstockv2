
import { useState, useCallback } from 'react';
import { SoundFX } from '../../services/audio';

interface CloudActionOptions<T> {
    action: (params?: any) => Promise<T>;
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
    successMsg?: string;
    errorMsg?: string;
}

/**
 * HOOK DE ACCIÓN DE NUBE v1.2
 * Estandariza cómo la app interactúa con Google Cloud/AppSheet.
 * Garantiza que los errores se reporten visualmente.
 */
export const useCloudAction = <T,>() => {
    const [isLoading, setIsLoading] = useState(false);

    const execute = useCallback(async (options: CloudActionOptions<T>, params?: any) => {
        if (!navigator.onLine) {
            SoundFX.play('error');
            alert("⚠️ Sin conexión a internet. Verifique su red.");
            return;
        }

        setIsLoading(true);
        try {
            console.log("[CloudAction] Iniciando ejecución...");
            const result = await options.action(params);
            
            SoundFX.play('success');
            if (options.successMsg) console.log(`[CloudAction] Success: ${options.successMsg}`);
            
            if (options.onSuccess) {
                options.onSuccess(result);
            } else {
                alert("✅ Operación completada con éxito.");
            }
            
            return result;
        } catch (error: any) {
            console.error("[CloudAction] Fallo detectado:", error);
            SoundFX.play('error');
            
            const msg = options.errorMsg 
                ? `${options.errorMsg}: ${error.message || 'Error desconocido'}` 
                : `❌ Error en la nube: ${error.message || 'Fallo de respuesta'}`;
            
            alert(msg);
            
            if (options.onError) {
                options.onError(error);
            }
            
            throw error; // Re-lanzar para permitir manejo superior si es necesario
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { execute, isLoading };
};
