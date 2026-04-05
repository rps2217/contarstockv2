
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'PROCESS_REPORT') {
    const { scans, products } = payload;
    
    // Simulating heavy processing
    const productMap = new Map(products.map((p: any) => [p.barcode, p]));
    const reportData = scans.map((scan: any) => {
      const product = productMap.get(scan.barcode) as any;
      return {
        ...scan,
        productName: product?.name || 'Desconocido',
        category: product?.category || 'Sin Categoría'
      };
    });

    // Group by category
    const byCategory = reportData.reduce((acc: any, curr: any) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});

    self.postMessage({ 
      type: 'REPORT_READY', 
      payload: { reportData, byCategory } 
    });
  }
};

// Forced GitHub sync
