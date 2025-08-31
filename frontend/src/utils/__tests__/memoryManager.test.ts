/**
 * Memory Manager Tests
 */

import { memoryManager } from '../memoryManager';

// Mock performance.memory
const mockMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  jsHeapSizeLimit: 200 * 1024 * 1024 // 200MB
};

Object.defineProperty(performance, 'memory', {
  value: mockMemory,
  writable: true
});

describe('MemoryManager', () => {
  beforeEach(() => {
    memoryManager.clearCache();
  });

  afterAll(() => {
    memoryManager.destroy();
  });

  describe('getMemoryStats', () => {
    it('should return memory statistics', () => {
      const stats = memoryManager.getMemoryStats();
      expect(stats).toBeDefined();
      expect(stats?.usedJSHeapSize).toBe(mockMemory.usedJSHeapSize);
      expect(stats?.jsHeapSizeLimit).toBe(mockMemory.jsHeapSizeLimit);
    });
  });

  describe('isMemoryPressure', () => {
    it('should return false when memory usage is low', () => {
      mockMemory.usedJSHeapSize = 50 * 1024 * 1024; // 25% usage
      expect(memoryManager.isMemoryPressure()).toBe(false);
    });

    it('should return true when memory usage is high', () => {
      mockMemory.usedJSHeapSize = 170 * 1024 * 1024; // 85% usage
      expect(memoryManager.isMemoryPressure()).toBe(true);
    });
  });

  describe('cache operations', () => {
    it('should cache and retrieve data', () => {
      const testData = { test: 'data', array: [1, 2, 3] };
      memoryManager.cache('test-key', testData);
      
      const retrieved = memoryManager.getCached('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = memoryManager.getCached('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should remove cached items', () => {
      const testData = { test: 'data' };
      memoryManager.cache('test-key', testData);
      
      expect(memoryManager.getCached('test-key')).toEqual(testData);
      
      memoryManager.removeCached('test-key');
      expect(memoryManager.getCached('test-key')).toBeNull();
    });

    it('should clear all cached data', () => {
      memoryManager.cache('key1', { data: 1 });
      memoryManager.cache('key2', { data: 2 });
      
      expect(memoryManager.getCached('key1')).toBeDefined();
      expect(memoryManager.getCached('key2')).toBeDefined();
      
      memoryManager.clearCache();
      
      expect(memoryManager.getCached('key1')).toBeNull();
      expect(memoryManager.getCached('key2')).toBeNull();
    });
  });

  describe('memory estimation', () => {
    it('should estimate size of simple objects', () => {
      const smallObject = { a: 1, b: 'test' };
      memoryManager.cache('small', smallObject, 100);
      
      const retrieved = memoryManager.getCached('small');
      expect(retrieved).toEqual(smallObject);
    });

    it('should handle large arrays', () => {
      const largeArray = new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() }));
      memoryManager.cache('large-array', largeArray);
      
      const retrieved = memoryManager.getCached('large-array');
      expect(retrieved).toHaveLength(1000);
      expect(retrieved[0]).toEqual({ id: 0, value: expect.any(Number) });
    });
  });

  describe('cache eviction', () => {
    it('should evict least recently used items when cache is full', () => {
      // Set a very small cache size for testing
      const originalMaxSize = (memoryManager as any).maxCacheSize;
      (memoryManager as any).maxCacheSize = 1000; // 1KB
      
      // Add items that exceed cache size
      memoryManager.cache('item1', new Array(100).fill('a'), 500);
      memoryManager.cache('item2', new Array(100).fill('b'), 500);
      memoryManager.cache('item3', new Array(100).fill('c'), 500); // Should evict item1
      
      expect(memoryManager.getCached('item1')).toBeNull();
      expect(memoryManager.getCached('item2')).toBeDefined();
      expect(memoryManager.getCached('item3')).toBeDefined();
      
      // Restore original cache size
      (memoryManager as any).maxCacheSize = originalMaxSize;
    });
  });
});