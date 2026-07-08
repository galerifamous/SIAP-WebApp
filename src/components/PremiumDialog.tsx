/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  HelpCircle,
  X,
  AlertCircle
} from 'lucide-react';
import {
  ToastItem,
  ConfirmDialogOptions,
  subscribeToasts,
  subscribeConfirm,
  toast
} from '../utils/dialog';

export default function PremiumDialog() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmDialogOptions | null>(null);

  useEffect(() => {
    const unsubToasts = subscribeToasts(setToasts);
    const unsubConfirm = subscribeConfirm(setConfirm);
    return () => {
      unsubToasts();
      unsubConfirm();
    };
  }, []);

  // Map icons
  const getToastIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getToastBg = (type: ToastItem['type']) => {
    // Elegant, high-contrast, slight glassmorphism borders
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-white/95 dark:bg-[#13251c]/95 shadow-emerald-500/5';
      case 'error':
        return 'border-rose-500/30 bg-white/95 dark:bg-[#251313]/95 shadow-rose-500/5';
      case 'warning':
        return 'border-amber-500/30 bg-white/95 dark:bg-[#252013]/95 shadow-amber-500/5';
      case 'info':
      default:
        return 'border-blue-500/30 bg-white/95 dark:bg-[#131d25]/95 shadow-blue-500/5';
    }
  };

  // Confirm dialog styles
  const getConfirmIcon = (type?: 'info' | 'warning' | 'danger' | 'success') => {
    switch (type) {
      case 'success':
        return (
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-8 w-8" />
          </div>
        );
      case 'danger':
        return (
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-8 w-8" />
          </div>
        );
      case 'info':
        return (
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Info className="h-8 w-8" />
          </div>
        );
      case 'warning':
      default:
        return (
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = (type?: 'info' | 'warning' | 'danger' | 'success') => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white dark:bg-rose-600 dark:hover:bg-rose-500';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white dark:bg-blue-600 dark:hover:bg-blue-500';
      case 'warning':
      default:
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white dark:bg-amber-600 dark:hover:bg-amber-500';
    }
  };

  return (
    <>
      {/* 1. TOP-RIGHT FLOATING TOASTS */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md ${getToastBg(
                item.type
              )}`}
            >
              {getToastIcon(item.type)}
              <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed pr-2">
                {item.message}
              </div>
              <button
                onClick={() => {
                  // Manually dismiss
                  const idToDismiss = item.id;
                  // Dispatch internal dismiss update
                  const el = document.getElementById(`toast-dismiss-${idToDismiss}`);
                  if (el) el.click();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 2. CENTER PREMIUM MODAL DIALOG (CONFIRM / ALERT) */}
      <AnimatePresence>
        {confirm && (
          <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop with elegant micro-blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                // Clicking outside dialog can act as canceling if it's a Confirm
                if (confirm.cancelLabel) {
                  confirm.resolve(false);
                }
              }}
              className="fixed inset-0 bg-[#070e0a]/40 dark:bg-[#000000]/70 backdrop-blur-md"
            />

            {/* Modal Content Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-[#121c15] border border-slate-100 dark:border-emerald-900/30 p-6 text-center shadow-2xl z-[99999] transition-colors"
            >
              {getConfirmIcon(confirm.type)}

              <div className="mt-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 font-sans tracking-tight">
                  {confirm.title}
                </h3>
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-300 leading-relaxed">
                  {confirm.message.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-1' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3 justify-center">
                {/* OK / Yes Button */}
                <button
                  type="button"
                  id="premium-dialog-confirm-btn"
                  onClick={() => confirm.resolve(true)}
                  className={`inline-flex w-full sm:w-auto items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 scale-100 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonClasses(
                    confirm.type
                  )}`}
                >
                  {confirm.confirmLabel}
                </button>

                {/* Cancel Button (only shown if cancelLabel is provided - meaning it is a CONFIRM dialog) */}
                {confirm.cancelLabel && (
                  <button
                    type="button"
                    id="premium-dialog-cancel-btn"
                    onClick={() => confirm.resolve(false)}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-950 bg-white hover:bg-slate-50 dark:bg-[#16251c] dark:hover:bg-[#1b2f23] text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 scale-100 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#12261a]"
                  >
                    {confirm.cancelLabel}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
