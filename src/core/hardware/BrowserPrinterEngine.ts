import { logger } from '@/services/logger';
import { format } from 'date-fns';
import { getSettings } from '../../services/settings';

export interface PrintOptions {
  title: string;
  subtitle?: string;
  content: string;
  footer?: string;
  scripts?: string;
  hideHeader?: boolean;
}

export function printTicket({ title, subtitle, content, footer, scripts, hideHeader }: PrintOptions) {
  const settings = getSettings();
  const pharmacyName = settings.pharmacyName || 'LOGICOUNT PRO';
  const paperWidth = settings.thermalPrinter?.paperWidth || 80;
  const margin = settings.thermalPrinter?.margin || 2;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    logger.error('BrowserPrinterEngine', 'No se pudo abrir la ventana de impresión. Verifique los bloqueadores de popups');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Arial', sans-serif; 
            width: ${paperWidth}mm; 
            margin: 0 auto; 
            padding: 0 ${margin}mm; 
            color: #000; 
            background: #fff; 
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
          }
          
          .print-header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 8px; 
            margin-bottom: 10px; 
          }
          
          .pharmacy-name { 
            font-size: 16px; 
            font-weight: 900; 
            display: block;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          
          .ticket-title { 
            font-size: 12px; 
            font-weight: 700; 
            display: block;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .ticket-subtitle {
            font-size: 10px;
            font-weight: bold;
            display: block;
            margin-top: 2px;
          }

          /* Estilos comunes para items */
          .item { border-bottom: 1px solid #000; padding: 4px 0; page-break-inside: avoid; }
          .item-desc { font-weight: 900; font-size: 13px; line-height: 1.1; }
          
          .print-footer { 
            margin-top: 15px; 
            text-align: center; 
            border-top: 2px solid #000; 
            padding-top: 8px; 
            font-size: 10px; 
            font-weight: bold; 
          }

          @media print { 
            .no-print { display: none; } 
            body { width: 100%; }
          }
          
          .btn-print-manual {
            width: 100%;
            margin-top: 20px;
            padding: 15px;
            background: #000;
            color: #fff;
            border: none;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        ${!hideHeader ? `
        <div class="print-header">
          ${pharmacyName ? `<span class="pharmacy-name">${pharmacyName}</span>` : ''}
          ${title ? `<span class="ticket-title">${title}</span>` : ''}
          ${subtitle ? `<span class="ticket-subtitle">${subtitle}</span>` : ''}
        </div>
        ` : ''}

        <div class="print-content">
          ${content}
        </div>

        <div class="print-footer">
          ${footer || `GENERADO: ${format(new Date(), "dd/MM/yyyy HH:mm")}`}
        </div>

        <button class="no-print btn-print-manual" onclick="window.print()">🖨️ IMPRIMIR TICKET</button>

        ${scripts || ''}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
