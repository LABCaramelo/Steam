import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem =
  | { kind?: "item"; label: string; onSelect?: () => void; disabled?: boolean; checked?: boolean }
  | { kind: "separator" };

interface Props {
  trigger: (open: boolean) => ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  className?: string;
}

/** Click-to-open dropdown used by the title-bar menus, sort pickers and context menus. */
export function Menu({ trigger, items, align = "left", className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`menu ${className ?? ""}`} ref={ref}>
      <button type="button" className="menu__trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {trigger(open)}
      </button>
      {open && (
        <div className={`menu__popup menu__popup--${align}`} role="menu">
          {items.map((it, i) =>
            it.kind === "separator" ? (
              <div key={i} className="menu__sep" />
            ) : (
              <button
                key={i}
                role="menuitem"
                className={`menu__item ${it.checked ? "is-checked" : ""}`}
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect?.();
                }}
              >
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
