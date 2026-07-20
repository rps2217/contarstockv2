import { CLOUD_COLUMNS } from '../services/constants';

/**
 * Procesa la transformación de registros locales a formato de nube (Supabase)
 * de forma paralela.
 */
self.onmessage = (e: MessageEvent) => {
  const { consolidated, session, timestamp, uuidPrefix } = e.data;

  try {
    const rows = consolidated.map((item: any, index: number) => {
      // Generamos una clave única robusta
      const uniqueKey =
        `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${item.mm || 0}_${item.yyyy || 0}`.replace(
          /[^A-Z0-9_]/gi,
          ''
        );

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${day}/${month}/${year}`;

      return {
        [CLOUD_COLUMNS.ID]: `${uuidPrefix}-${index}`, // Col A
        [CLOUD_COLUMNS.UNIQUE_KEY]: uniqueKey, // Col B
        [CLOUD_COLUMNS.ENTRY_DATE]: dateStr, // Col C: FECHA_INGRESO (DD/MM/YYYY)
        [CLOUD_COLUMNS.BARCODE]: item.barcode, // Col D: COD PRODUCTO
        [CLOUD_COLUMNS.PRODUCT_NAME]: item.productName, // Col E: DESCRIPCION
        [CLOUD_COLUMNS.LABEL]: session.logisticsLabel, // Col F: ETIQUETAS
        [CLOUD_COLUMNS.QUANTITY]: item.totalQuantity, // Col G: CANTIDAD
        [CLOUD_COLUMNS.YEAR]: item.yyyy || 0, // Col H: YYYY
        [CLOUD_COLUMNS.ERP_ORDER]: session.erpOrder, // Col I: ERP
        [CLOUD_COLUMNS.DATE]: dateStr, // Col J: FECHA (DD/MM/YYYY)
        [CLOUD_COLUMNS.MONTH]: item.mm || 0, // Col K: MM
        [CLOUD_COLUMNS.INCIDENT]: item.isIncident ? 'FRC' : '',
      };
    });

    self.postMessage({ success: true, rows });
  } catch (err: unknown) {
    self.postMessage({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
};
