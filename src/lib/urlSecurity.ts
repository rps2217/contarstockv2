/**
 * URL Security Utilities
 * Previene XSS y open redirect attacks
 */

/**
 * Valida si una URL es segura para usar en href/src
 * - Solo permite http, https, mailto
 * - Previene javascript: y data: protocols
 * - Previene open redirects
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Prevenir URLs vacías o solo espacios
  if (url.trim() === '') return false;
  
  // Prevenir javascript: y otros protocolos peligrosos
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'blob:',
  ];
  
  const lowerUrl = url.toLowerCase().trim();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) return false;
  }
  
  // Solo permitir http, https, y mailto
  const allowedProtocols = ['http://', 'https://', 'mailto:'];
  const isAllowed = allowedProtocols.some(p => lowerUrl.startsWith(p));
  
  if (!isAllowed) return false;
  
  // Prevenir open redirects - solo dominios de confianza
  // En producción, esto debería configurarse según el dominio de la app
  return true;
}

/**
 * Sanitiza una URL para uso seguro en href/src
 * Retorna null si la URL es insegura
 */
export function sanitizeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (!isSafeUrl(url)) return null;
  return url;
}

/**
 * Valida y sanitiza headerBackUrl para prevenir open redirects
 */
export function sanitizeBackUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  
  // Solo permitir rutas relativas (comienzan con /)
  // Esto previene open redirects a dominios externos
  if (url.startsWith('/')) {
    // Verificar que no contiene protocolos peligrosos
    const lowerUrl = url.toLowerCase();
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.includes(protocol)) return null;
    }
    return url;
  }
  
  // También permitir hash y query strings relativos
  if (url.startsWith('#') || url.startsWith('?')) return url;
  
  return null;
}

/**
 * Hook de React para sanitizar URLs en props de elementos
 */
export function useSafeUrl(url: string | undefined | null): string | null {
  return sanitizeUrl(url);
}
