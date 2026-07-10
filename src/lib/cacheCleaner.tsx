/**
 * Servicio para limpiar cache y datos de la aplicación
 * Similar a un "reset" de la aplicación en el navegador
 */

import { toast } from 'sonner'

export interface CacheCleanResult {
  success: boolean
  cleared: {
    localStorage: boolean
    sessionStorage: boolean
    indexedDB: boolean
    caches: boolean
    serviceWorker: boolean
  }
  errors: string[]
}

/**
 * Limpia todos los datos almacenados por la aplicación
 */
export async function clearAllAppData(): Promise<CacheCleanResult> {
  const result: CacheCleanResult = {
    success: true,
    cleared: {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      caches: false,
      serviceWorker: false,
    },
    errors: [],
  }

  // 1. Limpiar localStorage
  try {
    localStorage.clear()
    result.cleared.localStorage = true
    console.log('[CacheCleaner] localStorage limpiado')
  } catch (err) {
    const error = `localStorage: ${err}`
    result.errors.push(error)
    console.error('[CacheCleaner] Error limpiando localStorage:', err)
  }

  // 2. Limpiar sessionStorage
  try {
    sessionStorage.clear()
    result.cleared.sessionStorage = true
    console.log('[CacheCleaner] sessionStorage limpiado')
  } catch (err) {
    const error = `sessionStorage: ${err}`
    result.errors.push(error)
    console.error('[CacheCleaner] Error limpiando sessionStorage:', err)
  }

  // 3. Limpiar IndexedDB
  try {
    const databases = await indexedDB.databases()
    for (const db of databases) {
      if (db.name) {
        const deleteReq = indexedDB.deleteDatabase(db.name)
        await new Promise<void>((resolve, reject) => {
          deleteReq.onsuccess = () => resolve()
          deleteReq.onerror = () => reject(deleteReq.error)
        })
      }
    }
    result.cleared.indexedDB = true
    console.log('[CacheCleaner] IndexedDB limpiado')
  } catch (err) {
    const error = `indexedDB: ${err}`
    result.errors.push(error)
    console.error('[CacheCleaner] Error limpiando IndexedDB:', err)
  }

  // 4. Limpiar Cache API
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          // Solo limpiar caches de nuestra app
          if (cacheName.includes('contarstock') || cacheName.includes('logicount') || cacheName.includes('sw')) {
            return caches.delete(cacheName)
          }
          return Promise.resolve()
        })
      )
      result.cleared.caches = true
      console.log('[CacheCleaner] Caches limpiados')
    }
  } catch (err) {
    const error = `caches: ${err}`
    result.errors.push(error)
    console.error('[CacheCleaner] Error limpiando caches:', err)
  }

  // 5. Desregistrar Service Worker
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
      }
      result.cleared.serviceWorker = true
      console.log('[CacheCleaner] Service Workers desregistrados')
    }
  } catch (err) {
    const error = `serviceWorker: ${err}`
    result.errors.push(error)
    console.error('[CacheCleaner] Error desregistrando Service Workers:', err)
  }

  result.success = result.errors.length === 0
  return result
}

/**
 * Muestra confirmación y ejecuta la limpieza
 */
export async function clearCacheWithConfirmation(): Promise<boolean> {
  const confirmed = confirm(
    '⚠️ ¿Estás seguro de limpiar todos los datos?\n\n' +
    'Esto eliminará:\n' +
    '• Datos guardados (productos, sesiones, eventos)\n' +
    '• Configuración de la app\n' +
    '• Cache del navegador\n' +
    '• Sesión de sincronización\n\n' +
    'La aplicación se recargará como si fuera la primera vez.\n\n' +
    'NOTA: Si tienes datos pendientes de sincronizar, podrían perderse.'
  )

  if (!confirmed) {
    return false
  }

  // Doble confirmación para evitar accidentes
  const doubleConfirm = confirm(
    '🔴 ÚLTIMA ADVERTENCIA 🔴\n\n' +
    'Esta acción NO se puede deshacer.\n' +
    'Todos los datos locales serán eliminados.\n\n' +
    '¿Continuar?'
  )

  if (!doubleConfirm) {
    return false
  }

  toast.info('Limpiando datos...', { duration: 2000 })

  try {
    const result = await clearAllAppData()

    if (result.success) {
      toast.success('✅ Datos limpiados correctamente', { duration: 3000 })
      
      // Esperar un momento y recargar la página
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
      
      return true
    } else {
      toast.error(
        <div className="flex flex-col">
          <span>⚠️ Limpieza completada con errores</span>
          <span className="text-xs opacity-70">
            {result.errors.length} error(es) encontrado(s)
          </span>
        </div>,
        { duration: 5000 }
      )
      
      // Aún así recargar si se pudo limpiar algo
      if (result.cleared.localStorage || result.cleared.indexedDB) {
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
      
      return false
    }
  } catch (err) {
    console.error('[CacheCleaner] Error general:', err)
    toast.error('Error al limpiar datos')
    return false
  }
}

/**
 * Obtiene información del almacenamiento usado
 */
export async function getStorageInfo(): Promise<{
  localStorage: { used: number; keys: number }
  sessionStorage: { used: number; keys: number }
  indexedDB: { databases: number }
  caches: { count: number; size: string }
}> {
  const info = {
    localStorage: { used: 0, keys: 0 },
    sessionStorage: { used: 0, keys: 0 },
    indexedDB: { databases: 0 },
    caches: { count: 0, size: '0 KB' },
  }

  // localStorage
  try {
    let used = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length
        info.localStorage.keys++
      }
    }
    info.localStorage.used = used
  } catch {}

  // sessionStorage
  try {
    let used = 0
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        used += sessionStorage[key].length + key.length
        info.sessionStorage.keys++
      }
    }
    info.sessionStorage.used = used
  } catch {}

  // IndexedDB
  try {
    const databases = await indexedDB.databases()
    info.indexedDB.databases = databases.length
  } catch {}

  // Caches
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      info.caches.count = cacheNames.filter(
        n => n.includes('contarstock') || n.includes('logicount') || n.includes('sw')
      ).length
    }
  } catch {}

  return info
}
