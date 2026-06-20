import{n as g}from"./index-Os9TssLz.js";import{f}from"./vendor-utils-CbfsKmSz.js";import{t as h}from"./ThermalPrinterEngine-Y567HG9l.js";function x({title:t,subtitle:e,content:a,footer:p,scripts:s,hideHeader:d}){var o,r;const n=g(),m=n.pharmacyName||"LOGICOUNT PRO",c=((o=n.thermalPrinter)==null?void 0:o.paperWidth)||80,l=((r=n.thermalPrinter)==null?void 0:r.margin)||2,i=window.open("","_blank");if(!i){console.error("No se pudo abrir la ventana de impresión. Verifique los bloqueadores de popups.");return}const b=`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${t}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Arial', sans-serif; 
            width: ${c}mm; 
            margin: 0 auto; 
            padding: 0 ${l}mm; 
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
        ${d?"":`
        <div class="print-header">
          ${`<span class="pharmacy-name">${m}</span>`}
          ${t?`<span class="ticket-title">${t}</span>`:""}
          ${e?`<span class="ticket-subtitle">${e}</span>`:""}
        </div>
        `}

        <div class="print-content">
          ${a}
        </div>

        <div class="print-footer">
          ${p||`GENERADO: ${f(new Date,"dd/MM/yyyy HH:mm")}`}
        </div>

        <button class="no-print btn-print-manual" onclick="window.print()">🖨️ IMPRIMIR TICKET</button>

        ${s||""}
      </body>
    </html>
  `;i.document.write(b),i.document.close()}class u{constructor(){this.thermal=h}async printBrowserTicket(e){x(e)}}const $=new u;export{$ as p};
