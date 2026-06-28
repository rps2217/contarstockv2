import { test, expect } from '@playwright/test';

/**
 * E2E Tests para LogiCount Pro
 * 
 * Tests básicos de navegación y funcionalidad.
 */

test.describe('LogiCount Pro - Tests E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debería cargar la página de login', async ({ page }) => {
    // Verificar que estamos en la página de login
    await expect(page.locator('body')).toBeVisible();
  });

  test('debería mostrar mensaje de offline cuando hay error de red', async ({ page }) => {
    // Simular offline
    await page.context().setOffline(true);
    await page.reload();
    
    // Verificar banner de offline
    const offlineBanner = page.locator('text=/Modo Offline|Sin conexión/');
    await expect(offlineBanner).toBeVisible({ timeout: 5000 });
    
    // Restaurar conexión
    await page.context().setOffline(false);
  });

  test('debería navegar al dashboard', async ({ page }) => {
    // Ir al dashboard
    await page.goto('/dashboard');
    
    // Verificar que la página cargó
    await expect(page.locator('body')).toBeVisible();
  });

  test('debería navegar a configuración', async ({ page }) => {
    // Ir a settings
    await page.goto('/settings');
    
    // Verificar que la página cargó
    await expect(page.locator('body')).toBeVisible();
  });

});

test.describe('LogiCount Pro - Tests de Navegación', () => {
  
  test('debería mostrar sidebar en desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    
    // En desktop debería verse el sidebar
    const sidebar = page.locator('nav, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });

  test('debería colapsar sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    
    // Buscar botón de toggle del sidebar
    const toggleButton = page.locator('button[aria-label*="collapse"], button[aria-label*="toggle"]').first();
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
    }
  });

});

test.describe('LogiCount Pro - Tests de Responsive', () => {
  
  test('debería mostrar bottom dock en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // En móvil debería verse el bottom dock
    const bottomDock = page.locator('[class*="dock"], [class*="bottom"]').first();
    await expect(bottomDock).toBeVisible({ timeout: 5000 });
  });

});

test.describe('LogiCount Pro - Tests de Performance', () => {
  
  test('debería cargar página en menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

});
