
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
 * HOOK DE ACCIÓN DE NUBE
 * Estandariza cómo la app interactúa con Google Cloud/AppSheet.
 */
export const useCloudAction = <T,>() => {
    const [isLoading, setIsLoading] = useState(false);

    const execute = useCallback(async (options: CloudActionOptions<T>, params?: any) => {
        if (!navigator.onLine) {
            SoundFX.play('error');
            alert("No hay conexión a internet.");
            return;
        }

        setIsLoading(true);
        try {
            const result = await options.action(params);
            SoundFX.play('success');
            if (options.successMsg) console.log(options.successMsg);
            options.onSuccess?.(result);
            return result;
        } catch (error: any) {
            SoundFX.play('error');
            const msg = options.errorMsg || `Error en la nube: ${error.message}`;
            alert(msg);
            options.onError?.(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { execute, isLoading };
};
