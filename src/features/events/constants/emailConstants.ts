/**
 * Email Constants - Plantillas y constantes para emails de eventos
 */

import { EmailTemplate } from '../../../repositories/EmailTemplateRepository';

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'default-1',
    name: 'Solicitud de Ajuste',
    to: 'inventario@empresa.com',
    subject: 'Solicitud de Ajuste de Inventario - [CANTIDAD_ITEMS] productos',
    body: 'Hola,\n\nTe escribo para solicitar autorización de ajuste de inventario para los siguientes productos, según los eventos capturados.\n\n[TABLA_PRODUCTOS]\n\nQuedo atento a tu confirmación para proceder.\n\nSaludos.',
    module: 'events'
  },
  {
    id: 'default-2',
    name: 'Reporte de Diferencias',
    to: 'recepcion@empresa.com',
    subject: 'Reporte de Diferencias de Pedido - [CANTIDAD_ITEMS] productos',
    body: 'Estimados,\n\nAdjunto el detalle de diferencias detectadas en la recepción de mercadería.\n\n[TABLA_PRODUCTOS]\n\nPor favor revisar y confirmar.\n\nSaludos.',
    module: 'events'
  },
  {
    id: 'default-3',
    name: 'Reporte General',
    to: '',
    subject: 'Reporte de Eventos - [FECHA]',
    body: 'Adjunto el detalle de los eventos seleccionados para revisión:\n\n[TABLA_PRODUCTOS]\n\nSaludos.',
    module: 'events'
  }
];

/**
 * Variables de reemplazo para templates
 */
export const EMAIL_TEMPLATE_VARS = {
  CANTIDAD_ITEMS: 'Cantidad de items seleccionados',
  FECHA: 'Fecha actual',
  TABLA_PRODUCTOS: 'Tabla con detalle de productos',
  TOTAL_UNIDADES: 'Suma de unidades',
} as const;
