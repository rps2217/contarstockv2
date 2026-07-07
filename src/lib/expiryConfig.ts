/**
 * =============================================================================
 * CONFIGURACIÓN DE VENCIMIENTOS
 * =============================================================================
 * 
 * Archivo centralizado para la configuración de años de vencimiento.
 * Un solo lugar para cambiar los valores.
 * 
 * @since 2026-07-07
 */

/** Año mínimo para registrar vencimientos */
export const EXPIRY_MIN_YEAR = 2025;

/** Año máximo para registrar vencimientos */
export const EXPIRY_MAX_YEAR = 2027;

/** Lista de años válidos para selectores */
export const EXPIRY_YEARS = Object.freeze(
  Array.from(
    { length: EXPIRY_MAX_YEAR - EXPIRY_MIN_YEAR + 1 }, 
    (_, i) => EXPIRY_MIN_YEAR + i
  )
) as readonly number[];

/**
 * Verifica si un año está dentro del rango válido
 */
export const isYearInRange = (year: number): boolean => {
  return year >= EXPIRY_MIN_YEAR && year <= EXPIRY_MAX_YEAR;
};

/**
 * Obtiene el indicador de "sin fecha" (para omitir registro)
 */
export const NO_DATE_INDICATOR = {
  month: 0,
  year: 9999,
} as const;

/**
 * Verifica si es un registro "sin fecha"
 */
export const isNoDateRecord = (month: number, year: number): boolean => {
  return month === NO_DATE_INDICATOR.month || year === NO_DATE_INDICATOR.year;
};
