import{c as p}from"./index-DQDGCxru.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=p("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);class D{constructor(){this.usbDevice=null,this.endpointOut=null,this.bleCharacteristic=null,this.bleDevice=null}async connectUSB(){var n,o,i;try{if(this.usbDevice=await navigator.usb.requestDevice({filters:[]}),!this.usbDevice)return!1;await this.usbDevice.open(),await this.usbDevice.selectConfiguration(1);const e=((o=(n=this.usbDevice.configuration)==null?void 0:n.interfaces.find(c=>c.alternates[0].interfaceClass===7))==null?void 0:o.interfaceNumber)||0;await this.usbDevice.claimInterface(e);const t=(i=this.usbDevice.configuration)==null?void 0:i.interfaces[e].alternates[0].endpoints.find(c=>c.direction==="out");if(!t)throw new Error("No output channel found.");return this.endpointOut=t.endpointNumber,!0}catch(e){return console.error("USB Connection Error:",e),!1}}async connectBluetooth(){try{const n=await navigator.bluetooth.requestDevice({filters:[{namePrefix:"SLK"},{namePrefix:"Sewoo"},{services:["000018f0-0000-1000-8000-00805f9b34fb"]},{services:["49535343-fe7d-4ae5-8fa9-9fafd205e455"]}],optionalServices:["49535343-fe7d-4ae5-8fa9-9fafd205e455","e7810a71-73ae-499d-8c15-faa9aef0c3f2"]}),i=await(await n.gatt.connect()).getPrimaryServices();for(const e of i){const c=(await e.getCharacteristics()).find(a=>a.properties.write||a.properties.writeWithoutResponse);if(c)return this.bleCharacteristic=c,this.bleDevice=n,!0}return!1}catch(n){return console.error("Bluetooth Connection Error:",n),!1}}async printRaw(n){if(this.usbDevice&&this.endpointOut!==null){await this.usbDevice.transferOut(this.endpointOut,n);return}if(this.bleCharacteristic)for(let i=0;i<n.length;i+=20){const e=n.slice(i,i+20);await this.bleCharacteristic.writeValue(e)}}async printLabel(n,o,i){const e=new TextEncoder,t={init:[27,64],alignCenter:[27,97,1],boldOn:[27,69,1],boldOff:[27,69,0],sizeBig:[29,33,17],sizeNormal:[29,33,0],feed:[10,10,10],cut:[29,86,66,0]},c=new Uint8Array([...t.init,...t.alignCenter,...t.boldOn,...e.encode(`LOGICOUNT PRO
`),...t.boldOff,...e.encode(`--------------------------------
`),...t.sizeBig,...e.encode(`${n}
`),...t.sizeNormal,...e.encode(`${o.substring(0,32)}
`),...t.boldOn,...e.encode(`CANTIDAD: ${i} UNID.
`),...t.boldOff,...e.encode(`${new Date().toLocaleString()}
`),...t.feed,...t.cut]);await this.printRaw(c)}async printSummaryReport(n,o,i){const e=new TextEncoder,t={init:[27,64],alignCenter:[27,97,1],alignLeft:[27,97,0],boldOn:[27,69,1],boldOff:[27,69,0],feed:[10,10,10,10],cut:[29,86,66,0]};let c=[...t.init,...t.alignCenter,...t.boldOn,...e.encode(`MANIFIESTO DE CARGA
`),...e.encode(`LOGICOUNT PRO v4.5
`),...t.boldOff,...e.encode(`--------------------------------
`),...t.alignLeft,...e.encode(`ORDEN ERP: ${n}
`),...e.encode(`BULTOS : ${o}
`),...e.encode(`FECHA : ${new Date().toLocaleString()}
`),...e.encode(`--------------------------------
`),...t.boldOn,...e.encode(`DESC | SKU
`),...e.encode(`TEO REAL DIFF
`),...t.boldOff,...e.encode(`--------------------------------
`)];i.forEach(r=>{const s=r.barcode.padEnd(20),l=(r.productName||"SIN_DESC").substring(0,32),u=String(r.expectedQuantity||0).padStart(5),f=String(r.totalQuantity||0).padStart(7),h=String(r.totalQuantity-(r.expectedQuantity||0)).padStart(7),b=[...e.encode(`${l}
`),...e.encode(`${s}
`),...e.encode(`${u} ${f} ${h}
`),...e.encode(`- - - - - - - - - - - - - - - -
`)];c.push(...b)});const a=i.reduce((r,s)=>r+s.totalQuantity,0),d=[...t.boldOn,...e.encode(`TOTAL UNIDADES: ${a}
`),...t.boldOff,...e.encode(`--------------------------------
`),...e.encode(`

__________________________
`),...t.alignCenter,...e.encode(`FIRMA AUDITORIA
`),...t.feed,...t.cut];await this.printRaw(new Uint8Array([...c,...d]))}isConnected(){const n=!!this.usbDevice&&this.usbDevice.opened,o=!!this.bleDevice&&this.bleDevice.gatt.connected;return n||o}getDeviceName(){return this.usbDevice?this.usbDevice.productName||"Sewoo USB":this.bleDevice?this.bleDevice.name||"Sewoo Bluetooth":"Desconocido"}}const g=new D;export{O as L,g as t};
