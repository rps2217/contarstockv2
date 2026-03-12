/**
 * SERVICIO DE IMPRESIÓN INDUSTRIAL
 * Centraliza la generación de documentos HTML para impresión térmica o PDF.
 */

export interface PrintOptions {
 title?: string;
 template?: 'barcode' | 'manifest' | 'qr';
}

const BARCODE_CSS = `
 @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
 @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&display=swap');
 body { margin: 0; padding: 20px; text-align: center; font-family: 'JetBrains Mono', monospace; }
 .label-container { border: 2px solid #000; border-radius: 10px; padding: 20px; max-width: 400px; margin: 0 auto; page-break-inside: avoid; }
 .barcode { font-family: 'Libre Barcode 128', cursive; font-size: 80px; line-height: 1; margin: 10px 0; white-space: nowrap; }
 .sku-text { font-size: 24px; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 5px; }
 .desc { font-size: 12px; text-transform: uppercase; font-weight: 700; line-height: 1.2; }
 .meta { font-size: 10px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
`;

export const printBarcode = (barcode: string, productName: string, meta?: string) => {
 const printWindow = window.open('', '_blank');
 if (!printWindow) {
 alert("El navegador bloqueó la ventana emergente de impresión.");
 return;
 }

 const htmlContent = `
 <html>
 <head>
 <title>Etiqueta ${barcode}</title>
 <style>${BARCODE_CSS}</style>
 </head>
 <body>
 <div class="label-container">
 <div class="sku-text">${barcode}</div>
 <div class="barcode">${barcode}</div>
 <div class="desc">${productName}</div>
 ${meta ? `<div class="meta">${meta}</div>` : ''}
 </div>
 <script>
 window.onload = function() { window.print(); window.close(); }
 </script>
 </body>
 </html>
 `;

 printWindow.document.write(htmlContent);
 printWindow.document.close();
};