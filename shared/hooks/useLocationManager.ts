
import { useState, useCallback } from 'react';
import { LocationService } from '../../services/locationService';

/**
 * HOOK: GESTOR DE UBICACIONES INDUSTRIAL
 */
export const useLocationManager = (storageKey: string = 'last_active_loc') => {
 const [currentLocation, setCurrentLocation] = useState(() => 
 localStorage.getItem(storageKey) || 'SIN_DEFINIR'
 );
 const [isModalOpen, setIsModalOpen] = useState(false);

 const setLocation = useCallback(async (name: string) => {
 const cleanName = String(name || '').trim().toUpperCase();
 if (!cleanName) return;

 await LocationService.saveLocation(cleanName);
 localStorage.setItem(storageKey, cleanName);
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
