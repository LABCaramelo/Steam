import { useEffect, type ReactNode } from "react";
import { IconClose } from "./Icons";

/** Settings-window style dialog: title strip, left page list, right content. */
export function ModalWindow({
  title,
  onClose,
  nav,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  nav?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-window ${wide ? "modal-window--wide" : ""}`} role="dialog" aria-label={title}>
        <div className="modal-window__titlebar">
          <span>{title}</span>
          <button onClick={onClose} title="Fechar">
            <IconClose size={14} />
          </button>
        </div>
        <div className="modal-window__body">
          {nav && <nav className="modal-window__nav">{nav}</nav>}
          <div className="modal-window__content">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean }) {
  return (
    <label className={`field ${disabled ? "is-disabled" : ""}`}>
      <div className="field__text">
        <div className="field__label">{label}</div>
        {desc && <div className="field__desc">{desc}</div>}
      </div>
      <button role="switch" aria-checked={checked} disabled={disabled} className={`toggle ${checked ? "is-on" : ""}`} onClick={() => !disabled && onChange(!checked)}>
        <span />
      </button>
    </label>
  );
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  desc,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  desc?: string;
}) {
  return (
    <label className="field">
      <div className="field__text">
        <div className="field__label">{label}</div>
        {desc && <div className="field__desc">{desc}</div>}
      </div>
      <select
        className="select"
        value={String(value)}
        onChange={(e) => {
          const opt = options.find((o) => String(o.value) === e.target.value);
          if (opt) onChange(opt.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
