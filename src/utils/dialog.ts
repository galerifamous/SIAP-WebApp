/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  resolve: (value: boolean) => void;
}

// Global list of listeners
let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let confirmListeners: Array<(confirm: ConfirmDialogOptions | null) => void> = [];

let activeToasts: ToastItem[] = [];
let activeConfirm: ConfirmDialogOptions | null = null;

export const toast = {
  show(message: string, type: ToastType = 'info', options?: ToastOptions) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };
    activeToasts = [...activeToasts, newToast];
    toastListeners.forEach(listener => listener(activeToasts));

    setTimeout(() => {
      activeToasts = activeToasts.filter(t => t.id !== id);
      toastListeners.forEach(listener => listener(activeToasts));
    }, options?.duration || 4500);
  },
  success(message: string, options?: ToastOptions) {
    this.show(message, 'success', options);
  },
  error(message: string, options?: ToastOptions) {
    this.show(message, 'error', options);
  },
  info(message: string, options?: ToastOptions) {
    this.show(message, 'info', options);
  },
  warning(message: string, options?: ToastOptions) {
    this.show(message, 'warning', options);
  }
};

export function showConfirm(
  message: string,
  options?: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
  }
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    activeConfirm = {
      message,
      title: options?.title || 'Konfirmasi Tindakan',
      confirmLabel: options?.confirmLabel || 'Ya, Lanjutkan',
      cancelLabel: options?.cancelLabel || 'Batal',
      type: options?.type || 'warning',
      resolve: (val) => {
        activeConfirm = null;
        confirmListeners.forEach(listener => listener(null));
        resolve(val);
      }
    };
    confirmListeners.forEach(listener => listener(activeConfirm));
  });
}

export function showAlert(
  message: string,
  options?: {
    title?: string;
    confirmLabel?: string;
    type?: 'info' | 'warning' | 'danger' | 'success' | 'error';
  }
): Promise<void> {
  return new Promise<void>((resolve) => {
    let modalType: 'info' | 'warning' | 'danger' | 'success' = 'info';
    if (options?.type === 'error') {
      modalType = 'danger';
    } else if (options?.type) {
      modalType = options.type as 'info' | 'warning' | 'danger' | 'success';
    }

    activeConfirm = {
      message,
      title: options?.title || 'Informasi',
      confirmLabel: options?.confirmLabel || 'Mengerti',
      cancelLabel: '', // Empty means simple Alert modal (no Cancel button)
      type: modalType,
      resolve: () => {
        activeConfirm = null;
        confirmListeners.forEach(listener => listener(null));
        resolve();
      }
    };
    confirmListeners.forEach(listener => listener(activeConfirm));
  });
}

// Subscribe hooks
export const subscribeToasts = (listener: (toasts: ToastItem[]) => void) => {
  toastListeners.push(listener);
  // Initial fire
  listener(activeToasts);
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
};

export const subscribeConfirm = (listener: (confirm: ConfirmDialogOptions | null) => void) => {
  confirmListeners.push(listener);
  // Initial fire
  listener(activeConfirm);
  return () => {
    confirmListeners = confirmListeners.filter(l => l !== listener);
  };
};
