import{p as g}from"./PrinterEngine-Bm4mua95.js";import{ad as h}from"./index-fft76F_t.js";import{h as d}from"./vendor-utils-cx5FaEdG.js";import"./ThermalPrinterEngine-Czy6PZKZ.js";import"./JsBarcode-C5aMIrqV.js";import"./vendor-react-CPSFPLP-.js";import"./vendor-ui-B6eNRkXn.js";import"./vendor-db-Bc1sp9FM.js";import"./vendor-ai-Dwzn4vLG.js";class l{static printTicket(r){g.printBrowserTicket(r)}}const k=o=>{const s=d(new Date,"MMMM yyyy",{locale:h}).toUpperCase(),a=o.length===0?"<div style='text-align:center; padding:20px; border:2px solid #000'>NO HAY REGISTROS</div>":o.map((t,i)=>`
        <div class="item">
          <div class="item-desc">${(t.productName||"").substring(0,60).toUpperCase()}</div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-top: 2px;">
            <div style="display: flex; flex-direction: column; gap: 1px; width: 58%;">
              <span style="font-weight: bold; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${(t.providerName||"").substring(0,30).toUpperCase()}</span>
              <span style="font-weight: 900; font-size: 10px; background-color: #eee; padding: 0px 4px; border: 1px solid #000; width: fit-content;">ID: ${t.barcode}</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; width: 42%;">
              <span style="font-weight: 900; font-size: 14px; border: 2px solid #000; padding: 0px 4px; background: #fff; line-height: 1.2; margin-bottom: 1px;">${t.expiryDateObj?d(t.expiryDateObj,"dd/MM/yy"):"N/A"}</span>
              <span style="font-size: 8px; font-weight: bold; white-space: nowrap;">RET: ${t.withdrawalDate?d(t.withdrawalDate,"dd/MM/yy"):"N/A"}</span>
            </div>
          </div>
          <div style="width: 100%; margin-top: 2px; display: flex; justify-content: center;">
            <svg style="height: 30px; width: 100%;" id="barcode_${i}"></svg>
          </div>
        </div>`).join("");l.printTicket({title:"REPORTE VENCIMIENTOS",subtitle:s,content:a,footer:`TOTAL PRODUCTOS: ${o.length}<br>${d(new Date,"dd/MM/yyyy HH:mm")}`,scripts:`
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      <script>
        window.onload = function() {
          const items = ${JSON.stringify(o.map(t=>({barcode:t.barcode})))};
          items.forEach((item, index) => {
            try {
              JsBarcode("#barcode_" + index, item.barcode, {
                format: "CODE128",
                lineColor: "#000",
                width: 2.0,
                height: 30,
                displayValue: false,
                margin: 0
              });
            } catch (e) {
              console.error("Error barcode", e);
            }
          });
          setTimeout(() => { window.print(); }, 500);
        };
      <\/script>
    `})},j=o=>{const r=window.open("","_blank","width=400,height=600");if(!r)return;const a=`
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
        ${o.map((t,i)=>`
    <div class="etiqueta-container">
        <div class="descripcion">${t.productName||"Sin Descripción"}</div>
        <svg id="barcode_${i}"></svg>
    </div>
  `).join("")}

        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
        <script>
            window.onload = function() {
                const items = ${JSON.stringify(o.map(t=>({barcode:t.barcode})))};
                
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
        <\/script>
    </body>
    </html>
  `;r.document.write(a),r.document.close()},$=o=>{var i;const s=d(new Date,"dd/MM/yyyy HH:mm"),a=((i=o[0])==null?void 0:i.frc)||"N/A",t=o.map(e=>`
    <div class="ticket-item" style="border-bottom: 1px dashed #bbb; padding: 4px 0; page-break-inside: avoid;">
      <div style="line-height: 1.1;">
        <span style="font-size: 11px; font-weight: 700; word-break: break-word; display: block; width: 100%; margin-bottom: 2px;">${(e.productName||"N/A").toUpperCase()}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; line-height: 1.1; font-size: 10px; font-weight: 600;">
        <span>SKU: ${e.barcode||"N/A"}</span>
        <span style="background: #000; color: #fff; padding: 1px 4px; border-radius: 2px; font-size: 11px;">CANT: ${e.quantity||0}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; line-height: 1.1; font-size: 10px; color: #000; margin-top: 2px; text-transform: uppercase;">
        <span>FRC: <strong style="font-size: 11px;">${e.frc||"N/A"}</strong></span>
        <span>DST: ${e.destino||"N/A"}</span>
      </div>
    </div>
  `).join("");l.printTicket({title:"",hideHeader:!0,content:t,footer:`
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; margin-top: 1px; text-align: center;">
        <svg id="frc_barcode" style="max-width: 80%; height: auto;"></svg>
        <div style="font-weight: 900; font-size: 14px; margin-top: 0px;">FRC: ${a}</div>
        <div style="font-size: 9px; font-weight: bold; margin-top: 1px;">FECHA: ${s}</div>
      </div>`,scripts:`
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      <script>
        window.onload = function() {
          try {
            const frc = "${a}";
            if (frc && frc !== 'N/A') {
              JsBarcode("#frc_barcode", frc, {
                format: "CODE128",
                lineColor: "#000",
                width: 1.6,
                height: 30,
                displayValue: false,
                margin: 0
              });
            }
          } catch (e) {
            console.error("Error generating FRC barcode", e);
          }
          setTimeout(() => { window.print(); }, 500);
        };
      <\/script>
    `})},M=o=>{const r=["SKU","Producto","Proveedor","Vencimiento","Retiro","Política","Estado","Ubicacion"],s=o.map(n=>[n.barcode,n.productName,n.providerName,n.expiryDateObj?d(n.expiryDateObj,"yyyy-MM-dd"):"",n.withdrawalDate?d(n.withdrawalDate,"yyyy-MM-dd"):"",n.hasCanje?"CANJE":"MERMA",n.status.toUpperCase(),n.location||""]),a=[r,...s].map(n=>n.join(",")).join(`
`),t=new Blob([a],{type:"text/csv;charset=utf-8;"}),i=document.createElement("a"),e=URL.createObjectURL(t);i.setAttribute("href",e),i.setAttribute("download",`vencimientos_${d(new Date,"yyyyMMdd")}.csv`),i.style.visibility="hidden",document.body.appendChild(i),i.click(),document.body.removeChild(i)},N=o=>{const r=window.open("","_blank");if(!r)return;const a=d(new Date,"dd/MM/yyyy HH:mm"),i=`
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
                <th style="text-align: center;">Retiro</th>
                <th style="text-align: center;">Política</th>
                <th style="text-align: right;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${o.map(e=>{const n=e.mm&&e.yyyy?`${String(e.mm).padStart(2,"0")}/${e.yyyy}`:"N/A",c=e.withdrawalDate?d(e.withdrawalDate,"dd/MM/yy"):"N/A",p=e.hasCanje?"Canje":"Merma";return`
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${e.barcode||"N/A"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${e.productName||"N/A"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${e.providerName||"N/A"}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${n}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; background-color: #f8fafc; font-weight: bold;">${c}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${e.quantity||1}</td>
      </tr>
    `}).join("")}
            </tbody>
          </table>
          
          <br>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            Total de productos: <strong>${o.length}</strong><br>
            Generado el: ${a}
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
      <\/script>
    </body>
    </html>
  `;r.document.write(i),r.document.close()};export{M as handleExportExpirationsCSV,k as handlePrintExpirations,j as handlePrintLabels,$ as handlePrintSelectedEvents,N as handleSendEmail};
