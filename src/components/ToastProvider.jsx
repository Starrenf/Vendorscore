import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone, message, title) => {
    const id = crypto?.randomUUID?.() || String(Date.now() + Math.random());
    const toast = { id, tone, title, message: message ?? "" };
    setToasts((prev) => [...prev, toast]);
    // auto-hide
    window.setTimeout(() => remove(id), 3500);
    return id;
  }, [remove]);

  const api = useMemo(() => ({
    success: (message, title = "Gelukt") => push("success", message, title),
    error: (message, title = "Fout") => push("danger", message, title),
    info: (message, title = "Info") => push("info", message, title),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2 right-4 bottom-4 md:bottom-auto md:top-16">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const cls =
    toast.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : toast.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className={`card border ${cls} px-4 py-3 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{toast.title}</div>
          <div className="text-sm leading-relaxed opacity-90">{toast.message}</div>
        </div>
        <button
          className="text-slate-600 hover:text-slate-900"
          aria-label="Sluiten"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
