const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

class CacheManager {
    constructor() {
        this.placesCache = new Map();
        this.initializeCache('placesCache');
    }

    initializeCache(cacheName) {
        if (!this[cacheName]) {
            this[cacheName] = new Map();
        }
    }

    async getOrSet(cacheName, cacheKey, fetchFunction, ttl = CACHE_TTL) {
        try {
            this.initializeCache(cacheName);
            const cache = this[cacheName];
            
            // Verificar si hay datos en caché y son recientes
            if (cache.has(cacheKey)) {
                const cached = cache.get(cacheKey);
                // Si los datos están en caché y no han expirado, devolverlos
                if (Date.now() - cached.timestamp < ttl) {
                    
                    return Array.isArray(cached.data) ? cached.data : [];
                }
                // Si los datos están expirados, limpiar la entrada
                cache.delete(cacheKey);
            }

            
            const freshData = await this.retryOperation(fetchFunction, MAX_RETRIES, RETRY_DELAY);
            
            // Solo guardar en caché si se obtuvieron datos válidos
            if (Array.isArray(freshData) && freshData.length > 0) {
                cache.set(cacheKey, {
                    data: freshData,
                    timestamp: Date.now()
                });
                
            }
            
            return freshData || [];
            
        } catch (error) {
            console.error('Error in getOrSet:', error);
            // En caso de error, devolver array vacío en lugar de fallar
            return [];
        }
    }

    async retryOperation(operation, maxRetries, delay) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await operation();
                // Verificar que el resultado sea válido
                if (result !== undefined && result !== null) {
                    return result;
                }
                // Si el resultado no es válido, esperar y reintentar
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed:`, error);
                if (i === maxRetries - 1) throw error; // Lanzar error en el último intento
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return []; // Devolver array vacío si todos los intentos fallan
    }

    clearExpired() {
        const now = Date.now();
        Object.entries(this).forEach(([key, cache]) => {
            if (cache instanceof Map) {
                for (const [cacheKey, value] of cache.entries()) {
                    if (now - value.timestamp > CACHE_TTL) {
                        cache.delete(cacheKey);
                    }
                }
            }
        });
    }

    // Limpiar toda la caché de un tipo específico
    clearCache(cacheName) {
        if (this[cacheName] instanceof Map) {
            this[cacheName].clear();
            return true;
        }
        return false;
    }
}



export const cacheManager = new CacheManager()