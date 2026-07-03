/**
 * Theme Utilities - Funciones helper para el sistema de temas
 */

export type Theme = 'dark' | 'light' | 'high-contrast' | 'gray' | 'night' | 'appsheet-dark';

/**
 * Verifica si el tema es oscuro
 */
export function isDarkTheme(theme: Theme): boolean {
  return theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray';
}

/**
 * Verifica si el tema es claro
 */
export function isLightTheme(theme: Theme): boolean {
  return theme === 'light' || theme === 'gray';
}

/**
 * Obtiene las clases CSS para el fondo según el tema
 */
export function getBackgroundClass(theme: Theme): string {
  switch (theme) {
    case 'dark':
    case 'night':
      return 'bg-[#0A0A0B]';
    case 'gray':
      return 'bg-[#E8E8E8]';
    case 'light':
      return 'bg-[#FAFAFA]';
    case 'high-contrast':
      return 'bg-black';
    case 'appsheet-dark':
      return 'bg-[#0F172A]';
    default:
      return 'bg-[#0A0A0B]';
  }
}

/**
 * Obtiene las clases CSS para el texto según el tema
 */
export function getTextClass(theme: Theme): string {
  if (isDarkTheme(theme)) {
    return 'text-white';
  }
  return 'text-[#171717]';
}

/**
 * Obtiene las clases CSS para texto secundario según el tema
 */
export function getMutedTextClass(theme: Theme): string {
  if (isDarkTheme(theme)) {
    return 'text-[#71717A]';
  }
  return 'text-[#737373]';
}

/**
 * Obtiene el color del texto primario en formato hex
 */
export function getPrimaryTextColor(theme: Theme): string {
  if (isDarkTheme(theme)) {
    return '#FAFAFA';
  }
  return '#171717';
}

/**
 * Obtiene el color de fondo base en formato hex
 */
export function getBaseBackgroundColor(theme: Theme): string {
  switch (theme) {
    case 'dark':
    case 'night':
      return '#0A0A0B';
    case 'gray':
      return '#E8E8E8';
    case 'light':
      return '#FAFAFA';
    case 'high-contrast':
      return '#000000';
    case 'appsheet-dark':
      return '#0F172A';
    default:
      return '#0A0A0B';
  }
}

/**
 * Obtiene el color del accent según el tema
 */
export function getAccentColor(theme: Theme): string {
  if (isDarkTheme(theme)) {
    return '#6B8CAE'; // Steel blue para temas oscuros
  }
  return '#2563EB'; // Blue para temas claros
}

/**
 * Obtiene las clases CSS para bordes sutiles
 */
export function getBorderClass(theme: Theme): string {
  if (isDarkTheme(theme)) {
    return 'border-[rgba(255,255,255,0.06)]';
  }
  return 'border-[rgba(0,0,0,0.12)]';
}

/**
 * Obtiene las clases CSS para inputs
 */
export function getInputClasses(theme: Theme): string {
  if (isDarkTheme(theme)) {
    return 'bg-[#222222] text-white border-[rgba(255,255,255,0.1)]';
  }
  return 'bg-white text-[#171717] border-[rgba(0,0,0,0.12)]';
}

/**
 * Obtiene las clases CSS para superficies elevadas
 */
export function getSurfaceClass(theme: Theme): string {
  if (isDarkTheme(theme)) {
    return 'bg-[#18181B]';
  }
  return 'bg-white';
}

/**
 * Obtiene el color del placeholder
 */
export function getPlaceholderColor(theme: Theme): string {
  if (isDarkTheme(theme)) {
    return '#71717A';
  }
  return '#737373';
}
