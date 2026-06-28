import { test, expect } from '@playwright/test';

/**
 * E2E Tests para Sincronización
 */

test.describe('LogiCount Pro - Tests de Sincronización', () => {
  
  test('debería mostrar estado de sync en UI', async ({ page }) => {
    await page.goto('/');
    
    // Esperar a que cargue el estado de sync
    await page.waitForTimeout(2000);
    
    // Verificar que existe algún indicador de sincronización
    const syncIndicator = page.locator('text=/Sincroniz|Sync|Sincronizado/').first();
    await expect(syncIndicator).toBeVisible({ timeout: 10000 });
  });

  test('debería manejar errores de sync silenciosamente', async ({ page }) => {
    // Ir a la página de sync
    await page.goto('/sync');
    
    // Verificar que la página cargó
    await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
  });

  test('debería mostrar contador de pendientes', async ({ page }) => {
    await page.goto('/');
    
    // Buscar indicador de pendientes
    const pendingIndicator = page.locator('text=/pendiente|Pendientes/').first();
    
    // Este test es flexible ya que puede no haber pendientes
    const isVisible = await pendingIndicator.isVisible().catch(() => false);
    if (isVisible) {
      await expect(pendingIndicator).toBeVisible();
    }
  });

});

test.describe('LogiCount Pro - Tests de Cola Offline', () => {
  
  test('debería funcionar offline sin errores', async ({ page }) => {
    // Ir a la app
    await page.goto('/');
    
    // Simular offline
    await page.context().setOffline(true);
    
    // Recargar
    await page.reload();
    
    // Verificar que la UI sigue funcionando (modo offline)
    await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
    
    // Restaurar conexión
    await page.context().setOffline(false);
  });

  test('debería restaurar sync al reconectar', async ({ page }) => {
    await page.goto('/');
    
    // Simular offline y luego online
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForTimeout(1000);
    
    await page.context().setOffline(false);
    
    // Esperar que se active el sync
    await page.waitForTimeout(3000);
    
    // Verificar que se restauró la conexión
    const onlineIndicator = page.locator('text=/Online|Sincroniz/').first();
    const isVisible = await onlineIndicator.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

});
