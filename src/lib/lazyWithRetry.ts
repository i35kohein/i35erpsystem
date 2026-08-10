import { lazy, ComponentType } from 'react';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Wraps React.lazy with automatic retry on chunk load failure.
 * After MAX_RETRIES, forces a hard reload to fetch fresh chunks.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  moduleName?: string
) {
  return lazy(async () => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const module = await importFn();
        return module;
      } catch (err) {
        lastError = err as Error;
        const isChunkError = (err as Error)?.message?.includes('dynamically imported module') ||
                             (err as Error)?.message?.includes('ChunkLoadError');

        if (!isChunkError || attempt === MAX_RETRIES) {
          console.error(`[lazyWithRetry] ${moduleName || 'module'} failed after ${attempt + 1} attempts:`, err);
          throw err;
        }

        console.warn(`[lazyWithRetry] ${moduleName || 'module'} chunk load failed, retrying (${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    // If we get here, all retries exhausted — force reload
    console.error(`[lazyWithRetry] ${moduleName || 'module'} all retries exhausted, reloading page`);
    window.location.reload();
    throw lastError;
  });
}
