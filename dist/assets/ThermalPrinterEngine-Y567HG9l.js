import{J as $}from"./JsBarcode-iAwwRvo8.js";class T{constructor(){this.usbDevice=null,this.endpointOut=null,this.bleCharacteristic=null,this.bleDevice=null}async connectUSB(){var t,n,o;try{if(!navigator||!("usb"in navigator))throw new Error("WebUSB no es compatible con este navegador o entorno.");if(this.usbDevice=await navigator.usb.requestDevice({filters:[]}),!this.usbDevice)return!1;await this.usbDevice.open(),await this.usbDevice.selectConfiguration(1);const e=((n=(t=this.usbDevice.configuration)==null?void 0:t.interfaces.find(s=>s.alternates[0].interfaceClass===7))==null?void 0:n.interfaceNumber)||0;await this.usbDevice.claimInterface(e);const i=(o=this.usbDevice.configuration)==null?void 0:o.interfaces[e].alternates[0].endpoints.find(s=>s.direction==="out");if(!i)throw new Error("No output channel found.");return this.endpointOut=i.endpointNumber,!0}catch(e){throw(e==null?void 0:e.name)==="SecurityError"||String((e==null?void 0:e.message)||"").includes("permissions policy")||String((e==null?void 0:e.message)||"").includes("disallowed")?(console.warn("[USB] Bloqueado por política de seguridad (iframe o permisos)."),new Error("El acceso USB está restringido por la directiva de seguridad del navegador. Abre la aplicación en una pestaña nueva para poder vincular la impresora.")):(console.warn("[USB] Error de conexión:",(e==null?void 0:e.message)||e),e)}}async connectBluetooth(){try{if(!navigator||!("bluetooth"in navigator))throw new Error("WebBluetooth no es compatible con este navegador o entorno.");const t=await navigator.bluetooth.requestDevice({filters:[{namePrefix:"SLK"},{namePrefix:"Sewoo"},{services:["000018f0-0000-1000-8000-00805f9b34fb"]},{services:["49535343-fe7d-4ae5-8fa9-9fafd205e455"]}],optionalServices:["49535343-fe7d-4ae5-8fa9-9fafd205e455","e7810a71-73ae-499d-8c15-faa9aef0c3f2"]}),o=await(await t.gatt.connect()).getPrimaryServices();for(const e of o){const s=(await e.getCharacteristics()).find(p=>p.properties.write||p.properties.writeWithoutResponse);if(s)return this.bleCharacteristic=s,this.bleDevice=t,!0}return!1}catch(t){throw(t==null?void 0:t.name)==="SecurityError"||String((t==null?void 0:t.message)||"").includes("permissions policy")||String((t==null?void 0:t.message)||"").includes("disallowed")?(console.warn("[Bluetooth] Bloqueado por política de seguridad (iframe o permisos)."),new Error("El acceso Bluetooth está restringido por la directiva de seguridad del navegador. Abre la aplicación en una pestaña nueva para poder vincular la impresora.")):(console.warn("[Bluetooth] Error de conexión:",(t==null?void 0:t.message)||t),t)}}async printRaw(t){if(this.usbDevice&&this.endpointOut!==null){await this.usbDevice.transferOut(this.endpointOut,t);return}if(this.bleCharacteristic)for(let o=0;o<t.length;o+=20){const e=t.slice(o,o+20);await this.bleCharacteristic.writeValue(e)}}async printLabel(t,n,o){const e=new TextEncoder,i={init:[27,64],alignCenter:[27,97,1],boldOn:[27,69,1],boldOff:[27,69,0],sizeBig:[29,33,17],sizeNormal:[29,33,0],feed:[10,10,10],cut:[29,86,66,0]},s=new Uint8Array([...i.init,...i.alignCenter,...i.boldOn,...e.encode("LOGICOUNT PRO\\n"),...i.boldOff,...e.encode("--------------------------------\\n"),...i.sizeBig,...e.encode(`${t}\\n`),...i.sizeNormal,...e.encode(`${n.substring(0,32)}\\n`),...i.boldOn,...e.encode(`CANTIDAD: ${o} UNID.\\n`),...i.boldOff,...e.encode(`${new Date().toLocaleString()}\\n`),...i.feed,...i.cut]);await this.printRaw(s)}async printSummaryReport(t,n,o){if(this.isConnected()){const e=new TextEncoder,i={init:[27,64],alignCenter:[27,97,1],alignLeft:[27,97,0],boldOn:[27,69,1],boldOff:[27,69,0],feed:[10,10,10,10],cut:[29,86,66,0]};let s=[...i.init,...i.alignCenter,...i.boldOn,...e.encode("MANIFIESTO DE CARGA\\n"),...e.encode("LOGICOUNT PRO v4.5\\n"),...i.boldOff,...e.encode("--------------------------------\\n"),...i.alignLeft,...e.encode(`ORDEN ERP: ${t}\\n`),...e.encode(`BULTOS : ${n}\\n`),...e.encode(`FECHA : ${new Date().toLocaleString()}\\n`),...e.encode("--------------------------------\\n"),...i.boldOn,...e.encode("DESC | SKU\\n"),...e.encode("TEO REAL DIFF\\n"),...i.boldOff,...e.encode("--------------------------------\\n")];o.forEach(d=>{const f=d.barcode.padEnd(20),l=(d.productName||"SIN_DESC").substring(0,32),m=String(d.expectedQuantity||0).padStart(5),a=String(d.totalQuantity||0).padStart(7),r=String(d.totalQuantity-(d.expectedQuantity||0)).padStart(7),u=[...e.encode(`${l}\\n`),...e.encode(`${f}\\n`),...e.encode(`${m} ${a} ${r}\\n`),...e.encode("- - - - - - - - - - - - - - - -\\n")];s.push(...u)});const p=o.reduce((d,f)=>d+f.totalQuantity,0),g=[...i.boldOn,...e.encode(`TOTAL UNIDADES: ${p}\\n`),...i.boldOff,...e.encode("--------------------------------\\n"),...e.encode("\\n\\n__________________________\\n"),...i.alignCenter,...e.encode("FIRMA AUDITORIA\\n"),...i.feed,...i.cut];await this.printRaw(new Uint8Array([...s,...g]))}else this.printViaIframe80mm(t,n,o)}printViaIframe80mm(t,n,o){var l,m;const e=document.getElementById("thermal-print-iframe");e&&((l=e.parentNode)==null||l.removeChild(e));const i=document.createElement("iframe");i.id="thermal-print-iframe",i.style.position="fixed",i.style.bottom="0",i.style.right="0",i.style.width="0",i.style.height="0",i.style.border="none",document.body.appendChild(i);const s=((m=i.contentWindow)==null?void 0:m.document)||i.contentDocument;if(!s){console.error("No se pudo iniciar el canal de impresión nativa.");return}const p=o.reduce((a,r)=>a+r.totalQuantity,0),g=new Date().toLocaleString("es-ES"),d=o.map(a=>{const r=a.totalQuantity-(a.expectedQuantity||0),u=r>0?`+${r}`:String(r),b=r===0?"":r>0?"color: #059669; font-weight: bold;":"color: #dc2626; font-weight: bold;",h=this.getBarcodeDataUrl(a.barcode);return`
        <tr class="item-row">
          <td colspan="4" style="font-weight: bold; font-size: 11px; padding-top: 6px; padding-bottom: 2px;">
            ${a.productName||"SIN DESCRIPCIÓN"}
          </td>
        </tr>
        <tr class="item-subrow" style="border-bottom: 1px dashed #ccc;">
          <td style="padding-bottom: 6px; vertical-align: middle;">
            ${h?`
              <img src="${h}" alt="${a.barcode}" style="max-height: 42px; max-width: 145px; width: auto; height: auto; display: block; image-rendering: pixelated; image-rendering: crisp-edges; background: #ffffff;" />
            `:`
              <span style="font-size: 9px; font-family: monospace; color: #4b5563;">${a.barcode}</span>
            `}
          </td>
          <td class="text-right" style="font-size: 11px; padding-bottom: 6px; font-family: monospace; vertical-align: middle;">
            ${a.expectedQuantity||0}
          </td>
          <td class="text-right" style="font-size: 11px; padding-bottom: 6px; font-weight: bold; font-family: monospace; vertical-align: middle;">
            ${a.totalQuantity||0}
          </td>
          <td class="text-right" style="font-size: 11px; padding-bottom: 6px; ${b} font-family: monospace; vertical-align: middle;">
            ${u}
          </td>
        </tr>
      `}).join(""),f=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Manifiesto de Carga - Rollo 80mm</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            @media print {
              body {
                width: 72mm;
                margin: 0;
                padding: 10px 4mm;
                background-color: white;
                color: black;
              }
              .no-print {
                display: none !important;
              }
            }
            body {
              width: 72mm;
              margin: 0 auto;
              padding: 15px;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.35;
              color: #000;
              background: #fff;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
            }
            .header h1 {
              font-size: 13px;
              font-weight: 900;
              margin: 0 0 2px 0;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .header h2 {
              font-size: 11px;
              font-weight: 800;
              margin: 0 0 5px 0;
              text-transform: uppercase;
            }
            .header p {
              font-size: 9px;
              margin: 0;
              color: #4b5563;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
              height: 0;
            }
            .double-divider {
              border-top: 1px double #000;
              margin: 8px 0;
              height: 0;
            }
            .meta-section {
              margin-bottom: 12px;
              font-size: 10px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .meta-label {
              font-weight: bold;
              text-transform: uppercase;
            }
            .meta-value {
              text-align: right;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            .items-table th {
              font-weight: bold;
              text-transform: uppercase;
              font-size: 9px;
              padding-bottom: 4px;
              border-bottom: 1px solid #000;
            }
            .text-right {
              text-align: right;
            }
            .text-left {
              text-align: left;
            }
            .totals {
              margin-top: 12px;
              font-size: 11px;
              font-weight: bold;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .signature {
              margin-top: 35px;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              width: 75%;
              margin: 25px auto 5px auto;
            }
            .signature-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .pos-notice {
              margin-top: 20px;
              font-size: 8px;
              text-align: center;
              color: #6b7280;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LOGICOUNT PRO v4.5</h1>
            <h2>Manifiesto de Carga</h2>
            <p>Auditoría de Inventario</p>
          </div>

          <div class="divider"></div>

          <div class="meta-section">
            <div class="meta-row">
              <span class="meta-label">ERP / ORDEN:</span>
              <span class="meta-value" style="font-weight: bold;">${t}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">BULTOS:</span>
              <span class="meta-value">${n}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">FECHA:</span>
              <span class="meta-value">${g}</span>
            </div>
          </div>

          <div class="divider"></div>

          <table class="items-table">
            <thead>
              <tr>
                <th class="text-left" style="width: 55%;">DESC / SKU</th>
                <th class="text-right" style="width: 15%;">TEO</th>
                <th class="text-right" style="width: 15%;">REAL</th>
                <th class="text-right" style="width: 15%;">DIF</th>
              </tr>
            </thead>
            <tbody>
              ${d}
            </tbody>
          </table>

          <div class="double-divider"></div>

          <div class="totals">
            <div class="totals-row">
              <span>TOTAL SKUS:</span>
              <span>${o.length}</span>
            </div>
            <div class="totals-row" style="font-size: 12px; font-weight: 900;">
              <span>TOTAL UNIDADES:</span>
              <span>${p}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="signature">
            <div class="signature-line"></div>
            <div class="signature-label">Firma Auditoría</div>
            <div style="font-size: 8px; color: #4b5563; margin-top: 3px;">Operador Responsable</div>
          </div>

          <div class="pos-notice">
            Ajustado para rollo estándar de 80mm
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `;s.open(),s.write(f),s.close(),setTimeout(()=>{var a;(a=i.contentWindow)==null||a.focus()},100)}printExpectedOrder(t){var h,x,v,w,y,C,D,S,O;const n=document.getElementById("thermal-print-iframe");n&&((h=n.parentNode)==null||h.removeChild(n));const o=document.createElement("iframe");o.id="thermal-print-iframe",o.style.position="fixed",o.style.bottom="0",o.style.right="0",o.style.width="0",o.style.height="0",o.style.border="none",document.body.appendChild(o);const e=((x=o.contentWindow)==null?void 0:x.document)||o.contentDocument;if(!e){console.error("No se pudo iniciar el canal de impresión nativa.");return}const i=((v=t.metadata)==null?void 0:v.documentType)||"CARGA TEÓRICA",s=t.id,p=((w=t.items)==null?void 0:w.length)||0,g=((y=t.metadata)==null?void 0:y.date)||new Date(t.importedAt||Date.now()).toLocaleDateString("es-ES"),d=new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}),f=new Date().toLocaleDateString("es-ES")+" "+d,l=((C=t.metadata)==null?void 0:C.documentType)||"",m=l==="Remisión"||l.toLowerCase().includes("guía")||l.toLowerCase().includes("guia")||l.toLowerCase().includes("despacho"),a=((D=t.metadata)==null?void 0:D.documentType)||"CARGA TEÓRICA";let r="CARGA TEÓRICA";a.toLowerCase().includes("factura")?r="FACTURA":a.toLowerCase().includes("remisión")||a.toLowerCase().includes("remision")||a.toLowerCase().includes("guía")||a.toLowerCase().includes("guia")||a.toLowerCase().includes("despacho")?r="GUÍA DE DESPACHO":a.toLowerCase().includes("picking")?r="PICKING LIST":a.toLowerCase().includes("manifiesto")?r="MANIFIESTO DE CARGA":a.toLowerCase().includes("inventario")?r="INVENTARIO TEÓRICO":r=a.toUpperCase();const u=(t.items||[]).map(c=>{const A=m?`${c.expectedQty||0}							`:c.barcode,E=this.getBarcodeDataUrl(A,!1,28);return`
        <div class="item-block">
          <div class="item-title">${c.name||"SIN DESCRIPCIÓN"}</div>
          
          <div class="item-meta">
            <div class="item-id-box">
              ID: ${c.barcode}
            </div>
            <div class="item-qty-box">
              ${c.expectedQty||0}
            </div>
          </div>

          ${E?`
            <div class="barcode-container">
              <img src="${E}" alt="${c.barcode}" class="barcode-img" />
            </div>
            ${m?`
              <div style="text-align: center; font-size: 7px; font-family: monospace; color: #444; margin-top: -2px; font-weight: bold; text-transform: uppercase;">
                [TECLADO RÁPIDO: CANT + 7 TABS]
              </div>
            `:""}
          `:`
            <div style="text-align: center; font-size: 8px; font-family: monospace; color: #666; margin-top: 4px;">
              [${c.barcode}]
            </div>
          `}
          
          <div class="item-divider"></div>
        </div>
      `}).join(""),b=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${i} - ${s}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            @media print {
              body {
                width: 72mm;
                margin: 0;
                padding: 10px 4mm;
                background-color: white;
                color: black;
              }
            }
            body {
              width: 72mm;
              margin: 0 auto;
              padding: 15px;
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              box-sizing: border-box;
            }
            .header-print {
              text-align: center;
              margin-bottom: 8px;
            }
            .header-print h1 {
              font-size: 16px;
              font-weight: 900;
              margin: 0 0 2px 0;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .header-print h2 {
              font-size: 12px;
              font-weight: 800;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.2px;
            }
            .header-print .date {
              font-size: 10px;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
            }
            .header-line {
              border-top: 3px solid #000;
              margin: 8px 0;
              height: 0;
            }
            .item-block {
              margin-bottom: 12px;
              page-break-inside: avoid;
            }
            .item-title {
              font-size: 12px;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 4px;
              word-wrap: break-word;
            }
            .item-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
              font-size: 10px;
              font-weight: bold;
            }
            .item-id-box {
              border: 1px solid #000;
              padding: 2px 5px;
              font-family: monospace;
              text-transform: uppercase;
            }
            .item-qty-box {
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              border: 1.5px solid #888;
              padding: 2px 8px;
              background-color: #fff;
              color: #000;
              border-radius: 4px;
            }
            .barcode-container {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 4px 0;
            }
            .barcode-img {
              max-height: 300px;
              max-height: 28px;
              max-width: 100%;
              width: auto;
              height: auto;
              display: block;
              image-rendering: pixelated;
              image-rendering: crisp-edges;
            }
            .item-divider {
              border-top: 1px solid #000;
              margin-top: 10px;
              height: 0;
            }
            .bottom-summary {
              text-align: center;
              margin-top: 20px;
              font-weight: bold;
              page-break-inside: avoid;
            }
            .summary-total {
              font-size: 12px;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .summary-date {
              font-size: 9px;
              font-family: monospace;
            }
            .bottom-line {
              border-top: 3px solid #000;
              margin: 10px 0;
              height: 0;
            }
          </style>
        </head>
        <body>
          <div class="header-print">
            <h1>${r}</h1>
            <h2>Nº DOC: ${s}</h2>
            ${m?`
              <div style="font-[7px] font-weight: bold; margin-bottom: 2px; text-transform: uppercase; color: #333;">
                MODO TECLADO: CANT + 7 TABS
              </div>
            `:""}
            <div class="date">${g}</div>
          </div>
          
          <div class="header-line"></div>

          <div class="meta-info" style="font-size: 10px; font-weight: bold; margin-bottom: 12px; font-family: monospace; text-transform: uppercase; line-height: 1.4;">
            ${(S=t.metadata)!=null&&S.purchaseOrder?`OC: ${t.metadata.purchaseOrder}<br/>`:""}
            ${(O=t.metadata)!=null&&O.orderNote?`NOTA: ${t.metadata.orderNote}<br/>`:""}
          </div>

          <div class="items-container">
            ${u}
          </div>

          <div class="bottom-line"></div>

          <div class="bottom-summary">
            <div class="summary-total">TOTAL PRODUCTOS: ${p}</div>
            <div class="summary-date">${f}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `;e.open(),e.write(b),e.close(),setTimeout(()=>{var c;(c=o.contentWindow)==null||c.focus()},120)}getBarcodeDataUrl(t,n=!0,o=45){if(!t)return"";try{const e=document.createElement("canvas");return $(e,t,{format:"CODE128",width:2,height:o,displayValue:n,fontSize:10,font:"monospace",fontOptions:"bold",textMargin:3,margin:2,background:"#ffffff",lineColor:"#000000"}),e.toDataURL("image/png")}catch(e){return console.warn("Could not generate barcode with JSBarcode for:",t,e),""}}isConnected(){const t=!!this.usbDevice&&this.usbDevice.opened,n=!!this.bleDevice&&this.bleDevice.gatt.connected;return t||n}getDeviceName(){return this.usbDevice?this.usbDevice.productName||"Sewoo USB":this.bleDevice?this.bleDevice.name||"Sewoo Bluetooth":"Desconocido"}}const z=new T;export{z as t};
