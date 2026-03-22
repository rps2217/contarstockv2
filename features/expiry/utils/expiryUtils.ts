
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const handlePrintExpirations = (processedScans: any[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const now = new Date();
  const nombreMesTitulo = format(now, "MMMM yyyy", { locale: es }).toUpperCase();

  const listaItems = processedScans.length === 0 
    ? `<div style='text-align:center; padding:20px; border:2px solid #000'>NO HAY REGISTROS</div>`
    : processedScans.map(r => `
        <div class="item">
          <div class="col-left">
            <span class="desc">${(r.productName || '').substring(0,25).toUpperCase()}</span><br>
            <span class="prov">${(r.providerName || '').substring(0,20).toUpperCase()}</span><br>
            <span class="cod-grande">ID: ${r.barcode}</span>
          </div>
          <div class="col-right">
            <span class="lbl">VENCE</span><br>
            <span class="venc-grande">${r.expiryDateObj ? format(r.expiryDateObj, 'dd/MM/yy') : 'N/A'}</span><br>
            <span class="lbl-mini">RET: ${r.withdrawalDate ? format(r.withdrawalDate, 'dd/MM/yy') : 'N/A'}</span>
          </div>
        </div>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; width: 72mm; margin: 0 auto; padding: 0; color: #000; background: #fff; }
          .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
          .titulo { font-size: 16px; font-weight: 900; }
          
          .item { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding: 8px 0; align-items: flex-start; page-break-inside: avoid; }
          .col-left { width: 68%; text-align: left; }
          .col-right { width: 30%; text-align: right; }
          
          .desc { font-weight: 900; font-size: 13px; line-height: 1.2; }
          .prov { font-weight: bold; font-size: 11px; margin-top: 2px; display: block; }
          
          .cod-grande { font-weight: 900; font-size: 12px; margin-top: 4px; display: inline-block; background-color: #eee; padding: 1px 3px; }
          
          .venc-grande { font-weight: 900; font-size: 14px; border: 1px solid #000; padding: 1px; display: inline-block; margin: 2px 0; }
          .lbl { font-size: 9px; font-weight: bold; }
          .lbl-mini { font-size: 9px; font-weight: bold; }

          .footer { margin-top: 10px; text-align: center; border-top: 3px solid #000; padding-top: 5px; font-size: 11px; font-weight: bold; }
          @media print { 
            .no-print { display: none; } 
            body { width: 100%; }
            @page { margin: 0; }
          }
        </style>
        <script>window.onload = function() { window.print(); }</script>
      </head>
      <body>
        <div class="header">
          <span class="titulo">REPORTE VENCIMIENTOS</span><br>
          <strong>${nombreMesTitulo}</strong>
        </div>
        ${listaItems}
        <div class="footer">
          TOTAL PRODUCTOS: ${processedScans.length}<br>
          ${format(new Date(), "dd/MM/yyyy HH:mm")}
        </div>
        <button class="no-print" onclick="window.print()" style="width:100%; margin-top:20px; padding:15px; font-weight:bold; cursor:pointer;">🖨️ IMPRIMIR TICKET</button>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const handleExportExpirationsCSV = (processedScans: any[]) => {
  const headers = ["SKU", "Producto", "Vencimiento", "Estado", "Ubicacion"];
  const rows = processedScans.map(item => [
    item.barcode,
    item.productName,
    item.expiryDateObj ? format(item.expiryDateObj, 'yyyy-MM-dd') : '',
    item.status.toUpperCase(),
    item.location || ''
  ]);

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `vencimientos_${format(new Date(), 'yyyyMMdd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
