self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'PROCESS_REPORT') {
    const { scans, products } = payload as {
      scans: Record<string, unknown>[];
      products: Record<string, unknown>[];
    };

    // Simulating heavy processing
    const productMap = new Map(products.map(p => [p.barcode, p]));
    const reportData = scans.map(scan => {
      const product = productMap.get(scan.barcode as string);
      return {
        ...scan,
        productName: product?.name || 'Desconocido',
        category: product?.category || 'Sin Categoría',
      };
    });

    // Group by category
    const byCategory = reportData.reduce<Record<string, number>>((acc, curr) => {
      const cat = (curr.category as string) || 'Sin Categoría';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    self.postMessage({
      type: 'REPORT_READY',
      payload: { reportData, byCategory },
    });
  }
};
