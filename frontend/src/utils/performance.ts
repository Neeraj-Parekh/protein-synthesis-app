/**
 * Performance monitoring and optimization utilities
 */

// Memory management utilities
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryUsage: Map<string, number> = new Map();
  private maxMemoryMB: number = 8192; // 8GB limit

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Track memory usage for a component or operation
   */
  trackMemoryUsage(key: string, sizeMB: number): void {
    this.memoryUsage.set(key, sizeMB);
    this.checkMemoryLimits();
  }

  /**
   * Release memory for a component or operation
   */
  releaseMemory(key: string): void {
    this.memoryUsage.delete(key);
  }

  /**
   * Get current total memory usage
   */
  getTotalMemoryUsage(): number {
    return Array.from(this.memoryUsage.values()).reduce((sum, usage) => sum + usage, 0);
  }

  /**
   * Check if memory usage is approaching limits
   */
  private checkMemoryLimits(): void {
    const totalUsage = this.getTotalMemoryUsage();
    const usagePercentage = (totalUsage / this.maxMemoryMB) * 100;

    if (usagePercentage > 80) {
      console.warn(`Memory usage high: ${usagePercentage.toFixed(1)}% (${totalUsage.toFixed(1)}MB)`);
      this.triggerGarbageCollection();
    }
  }

  /**
   * Trigger garbage collection and cleanup
   */
  private triggerGarbageCollection(): void {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Emit event for components to cleanup
    window.dispatchEvent(new CustomEvent('memoryPressure', {
      detail: { usage: this.getTotalMemoryUsage() }
    }));
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(operation, duration);
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(operation: string, value: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * Get average performance for an operation
   */
  getAveragePerformance(operation: string): number {
    const values = this.metrics.get(operation);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [operation, values] of this.metrics.entries()) {
      if (values.length > 0) {
        stats[operation] = {
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }
    
    return stats;
  }
}

// Frame rate monitoring
export class FrameRateMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private isRunning = false;
  private callbacks: ((fps: number) => void)[] = [];

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
  }

  onFPSUpdate(callback: (fps: number) => void): () => void {
    this.callbacks.push(callback);
    
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // Notify callbacks
      this.callbacks.forEach(callback => callback(this.fps));
    }
    
    requestAnimationFrame(this.tick);
  };

  getCurrentFPS(): number {
    return this.fps;
  }
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Lazy loading utility
export function createLazyLoader<T>(
  loader: () => Promise<T>,
  _fallback?: T
): () => Promise<T> {
  let cached: T | null = null;
  let loading: Promise<T> | null = null;
  
  return async (): Promise<T> => {
    if (cached) {
      return cached;
    }
    
    if (loading) {
      return loading;
    }
    
    loading = loader().then(result => {
      cached = result;
      loading = null;
      return result;
    });
    
    return loading;
  };
}

// Progressive loading for large datasets
export class ProgressiveLoader<T> {
  private items: T[] = [];
  private batchSize: number;
  private currentIndex = 0;
  private onBatchLoad?: (batch: T[], progress: number) => void;

  constructor(
    items: T[],
    batchSize = 50,
    onBatchLoad?: (batch: T[], progress: number) => void
  ) {
    this.items = items;
    this.batchSize = batchSize;
    this.onBatchLoad = onBatchLoad;
  }

  async loadNext(): Promise<{ batch: T[]; hasMore: boolean; progress: number }> {
    const endIndex = Math.min(this.currentIndex + this.batchSize, this.items.length);
    const batch = this.items.slice(this.currentIndex, endIndex);
    const progress = (endIndex / this.items.length) * 100;
    const hasMore = endIndex < this.items.length;
    
    this.currentIndex = endIndex;
    
    if (this.onBatchLoad) {
      this.onBatchLoad(batch, progress);
    }
    
    // Add small delay to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 1));
    
    return { batch, hasMore, progress };
  }

  reset(): void {
    this.currentIndex = 0;
  }

  getProgress(): number {
    return (this.currentIndex / this.items.length) * 100;
  }
}

// WebGL performance utilities
export class WebGLPerformanceOptimizer {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private extensions: Record<string, any> = {};

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.loadExtensions();
  }

  private loadExtensions(): void {
    const extensionNames = [
      'OES_vertex_array_object',
      'WEBGL_lose_context',
      'EXT_disjoint_timer_query',
      'WEBGL_debug_renderer_info'
    ];

    extensionNames.forEach(name => {
      const ext = this.gl.getExtension(name);
      if (ext) {
        this.extensions[name] = ext;
      }
    });
  }

  /**
   * Get WebGL capabilities and limits
   */
  getCapabilities(): Record<string, any> {
    const gl = this.gl;
    
    return {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      renderer: gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION),
      extensions: Object.keys(this.extensions)
    };
  }

  /**
   * Optimize rendering settings based on capabilities
   */
  getOptimalSettings(): {
    maxVertices: number;
    maxTextures: number;
    useInstancing: boolean;
    useLOD: boolean;
  } {
    const caps = this.getCapabilities();
    
    return {
      maxVertices: Math.min(65536, caps.maxVertexAttribs * 1000),
      maxTextures: Math.min(16, caps.maxTextureSize / 1024),
      useInstancing: !!this.extensions['ANGLE_instanced_arrays'],
      useLOD: caps.maxFragmentUniforms > 64
    };
  }

  /**
   * Monitor GPU memory usage
   */
  getMemoryInfo(): { total?: number; used?: number } {
    const ext = this.extensions['WEBGL_debug_renderer_info'];
    if (!ext) return {};

    try {
      // This is browser-specific and may not work everywhere
      const info = this.gl.getExtension('WEBGL_debug_renderer_info');
      if (info) {
        return {
          // These are approximations and may not be accurate
          total: undefined,
          used: undefined
        };
      }
    } catch (e) {
      console.warn('Could not get GPU memory info:', e);
    }

    return {};
  }
}

// Export singleton instances
export const memoryManager = MemoryManager.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();
export const frameRateMonitor = new FrameRateMonitor();