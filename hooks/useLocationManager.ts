
import { useState, useEffect, useCallback } from 'react';
import { LocationService } from '../services/locationService';

/**
 * HOOK: GESTOR DE UBICACIONES
 * Encapsula la lógica de selección, historial y persistencia de zona física.
 */
export const useLocationManager = (storageKey: string = 'last_active_loc') => {
 const [currentLocation, setCurrentLocation] = useState(() => 
 localStorage.getItem(storageKey) || 'SIN_DEFINIR'
 );
 const [isModalOpen, setIsModalOpen] = useState(false);

 const setLocation = useCallback(async (name: string) => {
 const cleanName = name.trim().toUpperCase();
 if (!cleanName) return;

 // Persistencia en Disco para historial
 await LocationService.saveLocation(cleanName);
 
 // Persistencia en Preferencias para sesión actual
 localStorage.setItem(storageKey, cleanName);
 
 // Estado UI
 setCurrentLocation(cleanName);
 setIsModalOpen(false);
 }, [storageKey]);

 return {
 location: currentLocation,
 setLocation,
 isModalOpen,
 openModal: () => setIsModalOpen(true),
 closeModal: () => setIsModalOpen(false)
 };
};
