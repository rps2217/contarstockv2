/**
 * Event Constants - Constantes para el módulo de eventos
 */

export const EVENT_TYPES = [
  'DIF. PED.',
  'DET. PED.',
  'VENCE CERC.',
  'DET. CALIDAD INT.',
  'DET. CALIDAD EXT.',
  'CANJES',
  'MERMAS'
] as const;

export const DESTINOS = [
  'BOD. 37',
  'BOD. 80',
  'BOD. 95',
  'BOD. 98',
  'BOD. 106',
  'BOD. 121'
] as const;

export type EventType = typeof EVENT_TYPES[number];
export type Destino = typeof DESTINOS[number];

/**
 * Tipo para datos de evento
 */
export interface EventFormData {
  barcode: string;
  productName: string;
  providerName?: string;
  event: EventType;
  quantity: number;
  frc: string;
  nguia: string;
  destino: string;
  traspaso: string;
  observaciones: string;
}

/**
 * Tipo para ítem de evento en lista
 */
export interface EventListItem {
  barcode: string;
  productName: string;
  providerName?: string;
  quantity: number;
}
