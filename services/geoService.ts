
/**
 * Servicio de Geolocalización para Auditoría Logística
 */
export const getCurrentPosition = (): Promise<{ latitude: number, longitude: number } | null> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            return resolve(null);
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                console.warn("[GeoService] No se pudo obtener ubicación:", error.message);
                resolve(null);
            },
            {
                enableHighAccuracy: false, // Usar red para mayor velocidad en interiores (bodega)
                timeout: 5000,
                maximumAge: 60000 // Cachear ubicación por 1 minuto
            }
        );
    });
};
