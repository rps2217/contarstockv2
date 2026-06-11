import { printerManager } from '../core/hardware/PrinterEngine';
import { PrintOptions } from '../core/hardware/BrowserPrinterEngine';

export class PrintService {
  /**
   * Genera y abre una ventana de impresión con estilos base unificados
   * basados en la configuración global de la aplicación.
   */
  static printTicket(options: PrintOptions) {
    printerManager.printBrowserTicket(options);
  }
}
