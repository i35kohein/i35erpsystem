import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compress an image file to a small JPEG data-URL before storing it in the
 * database. Camera photos (2-5MB raw base64) were bloating the workOrders
 * collection to 2.6MB — every app load downloaded it (20-35s on slow links,
 * "data won't load"). Downscale to max ~900px + JPEG q0.62 → typically
 * 40-150KB per photo. Falls back to the raw data URL on failure.
 */
export function compressImageFile(file: File, maxDim = 900, quality = 0.62): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const original = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(original); return; }
          ctx.drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL('image/jpeg', quality);
          // Only use the compressed version if it's actually smaller
          resolve(out.length < original.length ? out : original);
        } catch {
          resolve(original);
        }
      };
      img.onerror = () => resolve(original);
      img.src = original;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
