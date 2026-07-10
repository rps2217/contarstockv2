import { printTicket, PrintOptions } from './BrowserPrinterEngine';
import { thermalPrinter, ThermalPrinterEngine } from './ThermalPrinterEngine';

export class HardwarePrinterFacade {
  public thermal: ThermalPrinterEngine = thermalPrinter;

  public async printBrowserTicket(options: PrintOptions): Promise<void> {
    printTicket(options);
  }
}

export const printerManager = new HardwarePrinterFacade();
