import { useState, type InputHTMLAttributes } from "react";

interface FocusFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function FocusField({ label, hint, error, id, className, ...props }: FocusFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const [focused, setFocused] = useState(false);

  return (
    <div className={`cm-field ${focused ? "is-focused" : ""} ${error ? "is-invalid" : ""} ${className ?? ""}`}>
      <input
        id={fieldId}
        className="cm-field__input"
        placeholder=" "
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        aria-describedby={hint ? `${fieldId}-hint` : undefined}
        aria-invalid={!!error}
        {...props}
      />
      <label htmlFor={fieldId} className="cm-field__label">
        {label}
      </label>
      <span className="cm-field__beam" aria-hidden="true" />
      {error && <span className="cm-field__error" role="alert">{error}</span>}
      {hint && !error && <span id={`${fieldId}-hint`} className="cm-field__hint">{hint}</span>}
    </div>
  );
}
