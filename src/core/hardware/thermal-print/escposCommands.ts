/**
 * =============================================================================
 * ESC/POS COMMANDS - Comandos para impresoras térmicas
 * =============================================================================
 *
 * Comandos ESC/POS para impresoras de 80mm y 58mm.
 *
 * @module thermal-print/escposCommands
 */

/** Comandos ESC/POS para impresoras térmicas */
export const ESC = {
  INIT: [0x1b, 0x40],
  ALIGN_CENTER: [0x1b, 0x61, 1],
  ALIGN_LEFT: [0x1b, 0x61, 0],
  ALIGN_RIGHT: [0x1b, 0x61, 2],
  BOLD_ON: [0x1b, 0x45, 1],
  BOLD_OFF: [0x1b, 0x45, 0],
  DOUBLE_HEIGHT: [0x1d, 0x21, 0x10],
  DOUBLE_WIDTH: [0x1d, 0x21, 0x20],
  DOUBLE_SIZE: [0x1d, 0x21, 0x30],
  NORMAL_SIZE: [0x1d, 0x21, 0x00],
  UNDERLINE_ON: [0x1b, 0x2d, 1],
  UNDERLINE_OFF: [0x1b, 0x2d, 0],
  CUT: [0x1d, 0x56, 0x42, 0x00],
  FEED: [0x0a, 0x0a, 0x0a, 0x0a],
  FEED_SHORT: [0x0a, 0x0a],
  LF: [0x0a],
};

/** Constantes de separador */
export const SEPARATOR = '-'.repeat(40);
export const SEPARATOR_THIN = '-'.repeat(32);

/** Línea vacía */
export const LINE_BREAK = [0x0a];

/** Formateadores para texto */
export const formatRow = (
  encoder: TextEncoder,
  columns: string[],
  widths: number[]
): Uint8Array => {
  let row = '';
  columns.forEach((col, i) => {
    row += col.substring(0, widths[i]).padEnd(widths[i]);
  });
  return encoder.encode(row + '\n');
};

/** Genera un ticket de manifiesto */
export const generateManifestTicket = (
  erp: string,
  label: string,
  items: Array<{
    barcode: string;
    productName?: string;
    expectedQty?: number;
    expectedQuantity?: number;
    quantity?: number;
    totalQuantity?: number;
  }>
): Uint8Array => {
  const encoder = new TextEncoder();
  const esc = ESC;

  const content: number[] = [
    ...esc.INIT,
    ...esc.ALIGN_CENTER,
    ...esc.BOLD_ON,
    ...esc.DOUBLE_SIZE,
    ...encoder.encode('MANIFIESTO\n'),
    ...encoder.encode('LOGICOUNT PRO\n'),
    ...esc.NORMAL_SIZE,
    ...esc.BOLD_OFF,
    ...encoder.encode(SEPARATOR + '\n'),
    ...esc.ALIGN_LEFT,
    ...encoder.encode(`ORDEN ERP: ${erp}\n`),
    ...encoder.encode(`BULTOS: ${label}\n`),
    ...encoder.encode(`FECHA: ${new Date().toLocaleString()}\n`),
    ...encoder.encode(SEPARATOR + '\n'),
    ...esc.BOLD_ON,
    ...encoder.encode('DESC | SKU\n'),
    ...esc.BOLD_OFF,
    ...encoder.encode(SEPARATOR + '\n'),
  ];

  items.forEach(item => {
    const sku = item.barcode.padEnd(20);
    const name = (item.productName || 'SIN_DESC').substring(0, 32);
    const theoVal = item.expectedQuantity || item.expectedQty || 0;
    const realVal = item.totalQuantity || item.quantity || 0;
    const theo = String(theoVal).padStart(5);
    const real = String(realVal).padStart(7);
    const diff = String(realVal - theoVal).padStart(7);

    content.push(
      ...encoder.encode(`${name}\n`),
      ...encoder.encode(`${sku}\n`),
      ...encoder.encode(`${theo} ${real} ${diff}\n`),
      ...encoder.encode(SEPARATOR_THIN + '\n')
    );
  });

  const totalReal = items.reduce((acc, i) => acc + (i.totalQuantity || i.quantity || 0), 0);
  const footer: number[] = [
    ...esc.BOLD_ON,
    ...encoder.encode(`TOTAL UNIDADES: ${totalReal}\n`),
    ...esc.BOLD_OFF,
    ...encoder.encode(SEPARATOR + '\n'),
    ...encoder.encode('\n\n__________________________\n'),
    ...esc.ALIGN_CENTER,
    ...encoder.encode('FIRMA AUDITORIA\n'),
    ...esc.FEED,
    ...esc.CUT,
  ];

  return new Uint8Array([...content, ...footer]);
};
