import { useEffect, useRef, type ReactNode } from "react";
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => { ref.current?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className="companion-modal" aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><header className="companion-heading"><h2>{title}</h2><button aria-label={`Close ${title}`} onClick={onClose}>×</button></header>{children}</dialog>;
}
