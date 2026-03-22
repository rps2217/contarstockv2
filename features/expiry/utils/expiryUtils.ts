
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Genera un reporte tipo ticket de los productos seleccionados
 */
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

/**
 * Genera etiquetas de código de barras para los productos seleccionados
 */
export const handlePrintLabels = (processedScans: any[]) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  const labelsHtml = processedScans.map((item, index) => `
    <div class="etiqueta-container">
        <div class="descripcion">${item.productName || 'Sin Descripción'}</div>
        <svg id="barcode_${index}"></svg>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Impresión de Etiquetas</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                background-color: white;
            }

            .etiqueta-container {
                background-color: white;
                width: 260px; 
                padding: 10px 5px;
                text-align: center;
                border-bottom: 1px dashed #ccc;
                page-break-inside: avoid;
            }

            .descripcion {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 5px;
                line-height: 1.1;
                max-height: 3em;
                overflow: hidden;
                color: black;
            }

            svg {
                max-width: 100%;
                height: auto;
            }

            @media print {
                @page {
                    size: auto;
                    margin: 0mm;
                }

                body {
                    background-color: white;
                    display: block;
                }

                .etiqueta-container {
                    border-bottom: none;
                    margin: 0;
                    width: 100%;
                    page-break-after: always;
                }
                
                .etiqueta-container:last-child {
                    page-break-after: auto;
                }
            }
        </style>
    </head>
    <body>
        ${labelsHtml}

        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
            window.onload = function() {
                const items = ${JSON.stringify(processedScans.map(i => ({ barcode: i.barcode })))};
                
                items.forEach((item, index) => {
                    try {
                        JsBarcode("#barcode_" + index, item.barcode, {
                            format: "CODE128",
                            lineColor: "#000",
                            width: 2,
                            height: 50,
                            displayValue: true,
                            fontSize: 14,
                            margin: 5
                        });
                    } catch (e) {
                        console.error("Error generating barcode for " + item.barcode, e);
                    }
                });

                setTimeout(function() {
                    window.print();
                    window.close();
                }, 800);
            };
        </script>
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

/**
 * Genera una tabla HTML con los productos seleccionados y la abre en una nueva pestaña
 * para que el usuario pueda copiarla y pegarla en su correo.
 */
export const handleSendEmail = (items: any[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const now = new Date();
  const fechaGeneracion = format(now, "dd/MM/yyyy HH:mm");

  const filasHtml = items.map(item => {
    const expiry = item.mm && item.yyyy ? `${String(item.mm).padStart(2, '0')}/${item.yyyy}` : 'N/A';
    
    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${item.barcode || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.productName || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.providerName || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${expiry}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity || 1}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Vencimientos para Correo</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          background-color: #f8fafc;
          color: #334155;
        }
        .container {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        h2 {
          color: #0f172a;
          margin-top: 0;
        }
        .instrucciones {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 0 4px 4px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 14px;
        }
        th {
          background-color: #f1f5f9;
          padding: 12px 8px;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: 600;
          color: #475569;
        }
        .btn-copiar {
          background-color: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 20px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-copiar:hover {
          background-color: #059669;
        }
        .btn-gmail {
          background-color: #ea4335;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 20px;
          margin-left: 10px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-gmail:hover {
          background-color: #d32f2f;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Reporte de Vencimientos</h2>
        
        <div class="instrucciones no-copy">
          <strong>Instrucciones:</strong>
          <ol style="margin-bottom: 0;">
            <li>Haz clic en "Copiar Tabla".</li>
            <li>Haz clic en "Abrir Gmail".</li>
            <li>Pega (Ctrl+V o Cmd+V) el contenido en el cuerpo del correo.</li>
          </ol>
        </div>

        <div class="no-copy">
          <button class="btn-copiar" onclick="copiarContenido()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copiar Tabla
          </button>
          <a href="https://mail.google.com/mail/?view=cm&fs=1&su=Reporte+de+Vencimientos+-+LogiCount" target="_blank" class="btn-gmail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            Abrir Gmail
          </a>
          <span id="mensaje-copiado" style="color: #10b981; font-weight: bold; margin-left: 10px; display: none;">¡Copiado al portapapeles!</span>
        </div>

        <div id="contenido-correo">
          <p>Adjunto el detalle de los productos seleccionados:</p>
          
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descripción</th>
                <th>Proveedor</th>
                <th style="text-align: center;">Vencimiento</th>
                <th style="text-align: right;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
          
          <br>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            Total de productos: <strong>${items.length}</strong><br>
            Generado el: ${fechaGeneracion}
          </p>
        </div>
      </div>

      <script>
        function copiarContenido() {
          const contenido = document.getElementById('contenido-correo');
          const seleccion = window.getSelection();
          const rango = document.createRange();
          rango.selectNodeContents(contenido);
          seleccion.removeAllRanges();
          seleccion.addRange(rango);
          
          try {
            document.execCommand('copy');
            const mensaje = document.getElementById('mensaje-copiado');
            mensaje.style.display = 'inline';
            setTimeout(() => {
              mensaje.style.display = 'none';
            }, 3000);
          } catch (err) {
            alert('No se pudo copiar automáticamente. Por favor, selecciona la tabla y presiona Ctrl+C.');
          }
          
          seleccion.removeAllRanges();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
