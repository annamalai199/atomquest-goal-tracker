/**
 * Performance utilities for instant UI feedback
 */

/**
 * Debounce function for input handlers
 * Reduces unnecessary re-renders while typing
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll/resize handlers
 * Limits execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Instant feedback wrapper
 * Executes callback immediately, then runs async operation
 */
export function withInstantFeedback<T>(
  feedbackFn: () => void,
  asyncFn: () => Promise<T>
): Promise<T> {
  // Execute feedback immediately (synchronous)
  feedbackFn();

  // Then run async operation
  return asyncFn();
}

/**
 * Optimistic update helper
 * Updates UI immediately, reverts on error
 */
export async function optimisticUpdate<T>(
  optimisticFn: () => void,
  asyncFn: () => Promise<T>,
  revertFn: () => void
): Promise<T> {
  try {
    // Apply optimistic update immediately
    optimisticFn();

    // Execute async operation
    const result = await asyncFn();

    return result;
  } catch (error) {
    // Revert on error
    revertFn();
    throw error;
  }
}

/**
 * Batch state updates to prevent multiple re-renders
 */
export function batchUpdates(updates: Array<() => void>): void {
  // React 18+ automatically batches updates
  // This is a helper for explicit batching if needed
  updates.forEach((update) => update());
}

/**
 * Request animation frame wrapper for smooth animations
 */
export function smoothUpdate(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  if (process.env.NODE_ENV === "development") {
    console.log(`⚡ ${name} took ${(end - start).toFixed(2)}ms`);
  }

  return result;
}

/**
 * Preload data for instant navigation
 */
export function preloadData(url: string): void {
  // Prefetch data in the background
  fetch(url, { method: "GET" }).catch(() => {
    // Silently fail - this is just a prefetch
  });
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get optimal transition duration based on user preferences
 */
export function getTransitionDuration(defaultMs: number = 100): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}
