import React, { ComponentType, LazyExoticComponent } from 'react';

/**
 * Wraps React.lazy to automatically reload the page if a chunk fails to load.
 * This fixes the "Failed to fetch dynamically imported module" error that happens
 * when a new version is deployed while a user has the app open.
 */
export const lazyWithRetry = (
  componentImport: () => Promise<{ default: ComponentType<any> }>
): LazyExoticComponent<ComponentType<any>> => {
  return React.lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error: any) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assuming that the user is not on the latest version of the application.
        // Let's refresh the page immediately.
        console.log("Version mismatch detected. Reloading...");
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      
      // If we already reloaded and it still fails, it's a real network error or bug.
      throw error;
    }
  });
};
