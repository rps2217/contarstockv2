import { useState, useEffect } from 'react';

export const useStorageStatus = () => {
  const [storageUsage, setStorageUsage] = useState<{ used: number, quota: number } | null>(null);

  useEffect(() => {
    const checkStorage = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage && estimate.quota) {
          setStorageUsage({ used: estimate.usage, quota: estimate.quota });
        }
      }
    };
    checkStorage();
  }, []);

  return storageUsage;
};
