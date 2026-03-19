
import { SoundFX } from './audio';

export interface ErpManifest {
  id: string;
  expectedTrays: number;
  description: string;
  status: 'pending' | 'completed';
}

/**
 * Service to simulate ERP interactions for cloud downloads.
 */
export const erpService = {
  /**
   * Simulates downloading a manifest from the cloud.
   */
  async downloadManifest(manifestId: string): Promise<ErpManifest> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock logic: if manifest ends in 'error', simulate failure
    if (manifestId.toLowerCase().endsWith('error')) {
      throw new Error('No se encontró el manifiesto en el ERP.');
    }

    // Mock data
    const mockManifests: Record<string, ErpManifest> = {
      'GUIA-100': { id: 'GUIA-100', expectedTrays: 15, description: 'Carga General - Zona Norte', status: 'pending' },
      'GUIA-200': { id: 'GUIA-200', expectedTrays: 42, description: 'Suministros Médicos - Urgente', status: 'pending' },
      'GUIA-TEST': { id: 'GUIA-TEST', expectedTrays: 5, description: 'Prueba de Sistema', status: 'pending' },
    };

    const manifest = mockManifests[manifestId.toUpperCase()];

    if (!manifest) {
      // Return a generic one if not found in mock list but valid format
      return {
        id: manifestId.toUpperCase(),
        expectedTrays: Math.floor(Math.random() * 20) + 1,
        description: 'Manifiesto Genérico (Autocreado)',
        status: 'pending'
      };
    }

    return manifest;
  }
};
