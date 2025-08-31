/**
 * Memory Manager for Frontend
 * Handles memory optimization and cleanup for large protein structures
 */

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
  accessCount: number;
}

class MemoryManager {
  private cacheMap = new Map<string, CacheEntry<any>>();
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private currentCacheSize = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startMemoryMonitoring();
    this.startPeriodicCleanup();
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): MemoryStats | null {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  /**
   * Check if memory usage is approaching limits
   */
  isMemoryPressure(): boolean {
    const stats = this.getMemoryStats();
    if (!stats) return false;
    
    const usageRatio = stats.usedJSHeapSize / stats.jsHeapSizeLimit;
    return usageRatio > 0.8; // 80% threshold
  }

  /**
   * Cache data with automatic size management
   */
  cache<T>(key: string, data: T, estimatedSize?: number): void {
    const size = estimatedSize || this.estimateSize(data);
    
    // Check if we need to free space
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.evictLeastRecentlyUsed(size);
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      size,
      accessCount: 1
    };
    
    this.cacheMap.set(key, entry);
    this.currentCacheSize += size;
  }

  /**
   * Retrieve cached data
   */
  getCached<T>(key: string): T | null {
    const entry = this.cacheMap.get(key);
    if (!entry) return null;
    
    // Update access statistics
    entry.accessCount++;
    entry.timestamp = Date.now();
    
    return entry.data as T;
  }

  /**
   * Remove item from cache
   */
  removeCached(key: string): void {
    const entry = this.cacheMap.get(key);
    if (entry) {
      this.cacheMap.delete(key);
      this.currentCacheSize -= entry.size;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cacheMap.clear();
    this.currentCacheSize = 0;
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Estimate the memory size of an object
   */
  private estimateSize(obj: any): number {
    const seen = new WeakSet();
    
    const calculateSize = (obj: any): number => {
      if (obj === null || typeof obj !== 'object') {
        return typeof obj === 'string' ? obj.length * 2 : 8;
      }
      
      if (seen.has(obj)) return 0;
      seen.add(obj);
      
      let size = 0;
      
      if (Array.isArray(obj)) {
        size += obj.length * 8; // Array overhead
        for (const item of obj) {
          size += calculateSize(item);
        }
      } else if (obj instanceof ArrayBuffer) {
        size += obj.byteLength;
      } else if (obj instanceof Float32Array || obj instanceof Float64Array) {
        size += obj.byteLength;
      } else {
        size += Object.keys(obj).length * 8; // Object overhead
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            size += key.length * 2; // Key size
            size += calculateSize(obj[key]); // Value size
          }
        }
      }
      
      return size;
    };
    
    return calculateSize(obj);
  }

  /**
   * Evict least recently used items to free space
   */
  private evictLeastRecentlyUsed(requiredSpace: number): void {
    const entries = Array.from(this.cacheMap.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => {
        // Sort by access count (ascending) then by timestamp (ascending)
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        return a.timestamp - b.timestamp;
      });
    
    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cacheMap.delete(entry.key);
      this.currentCacheSize -= entry.size;
      freedSpace += entry.size;
    }
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      if (this.isMemoryPressure()) {
        console.warn('Memory pressure detected, clearing cache');
        this.clearCache();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Start periodic cleanup of old cache entries
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes
      
      for (const [key, entry] of this.cacheMap.entries()) {
        if (now - entry.timestamp > maxAge && entry.accessCount === 1) {
          this.removeCached(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    this.clearCache();
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();

/**
 * Hook for React components to use memory management
 */
export const useMemoryManager = () => {
  return {
    cache: memoryManager.cache.bind(memoryManager),
    getCached: memoryManager.getCached.bind(memoryManager),
    removeCached: memoryManager.removeCached.bind(memoryManager),
    clearCache: memoryManager.clearCache.bind(memoryManager),
    getMemoryStats: memoryManager.getMemoryStats.bind(memoryManager),
    isMemoryPressure: memoryManager.isMemoryPressure.bind(memoryManager)
  };
};

/**
 * Utility function to optimize large arrays for memory
 */
export const optimizeArrayForMemory = <T>(
  array: T[],
  chunkSize: number = 1000
): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Debounced function to prevent excessive memory operations
 */
export const debounceMemoryOperation = <T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): T => {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

export default memoryManager;