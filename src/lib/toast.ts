// Global toast bridge — lets any module fire the App-level toast system
// without prop-drilling `addToast` through 49 components.
// App.tsx registers its addToast implementation at mount via `registerToastHandler`.

export type ToastType = 'success' | 'info' | 'error';
export type ToastOptions = { persistent?: boolean; dismissible?: boolean; workOrderId?: string };

type ToastHandler = (message: string, type?: ToastType, title?: string, options?: ToastOptions) => void;

let handler: ToastHandler | null = null;

export function registerToastHandler(fn: ToastHandler) {
  handler = fn;
}

export function unregisterToastHandler() {
  handler = null;
}

/** Fire a toast from anywhere. Falls back to console if App hasn't mounted yet. */
export function toast(message: string, type: ToastType = 'success', title?: string, options?: ToastOptions) {
  if (handler) {
    handler(message, type, title, options);
  } else {
    // eslint-disable-next-line no-console
    console[type === 'error' ? 'error' : 'log'](`[toast:${type}] ${title ? title + ' — ' : ''}${message}`);
  }
}

toast.success = (message: string, title?: string) => toast(message, 'success', title);
toast.error = (message: string, title?: string) => toast(message, 'error', title);
toast.info = (message: string, title?: string) => toast(message, 'info', title);
