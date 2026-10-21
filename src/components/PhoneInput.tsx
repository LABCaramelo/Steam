import { FocusField } from "@caramelo/design-system";
import AO from "country-flag-icons/react/3x2/AO";
import AR from "country-flag-icons/react/3x2/AR";
import AU from "country-flag-icons/react/3x2/AU";
import BR from "country-flag-icons/react/3x2/BR";
import CA from "country-flag-icons/react/3x2/CA";
import CH from "country-flag-icons/react/3x2/CH";
import CL from "country-flag-icons/react/3x2/CL";
import CO from "country-flag-icons/react/3x2/CO";
import DE from "country-flag-icons/react/3x2/DE";
import ES from "country-flag-icons/react/3x2/ES";
import FR from "country-flag-icons/react/3x2/FR";
import GB from "country-flag-icons/react/3x2/GB";
import IE from "country-flag-icons/react/3x2/IE";
import IT from "country-flag-icons/react/3x2/IT";
import JP from "country-flag-icons/react/3x2/JP";
import MX from "country-flag-icons/react/3x2/MX";
import MZ from "country-flag-icons/react/3x2/MZ";
import NL from "country-flag-icons/react/3x2/NL";
import PE from "country-flag-icons/react/3x2/PE";
import PT from "country-flag-icons/react/3x2/PT";
import PY from "country-flag-icons/react/3x2/PY";
import US from "country-flag-icons/react/3x2/US";
import UY from "country-flag-icons/react/3x2/UY";
import { useLayoutEffect, useRef, type ChangeEvent } from "react";
import {
  COUNTRIES,
  INTL,
  caretAfterDigits,
  clampDigits,
  countryByIso,
  formatPhone,
  maxDigits,
  parseInternational,
  type PhoneValue,
} from "../phone";

// SVG flags: Windows does not draw flag emoji.
const FLAGS = { AO, AR, AU, BR, CA, CH, CL, CO, DE, ES, FR, GB, IE, IT, JP, MX, MZ, NL, PE, PT, PY, US, UY } as Record<string, typeof BR>;

function Globe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z" />
    </svg>
  );
}

interface PhoneInputProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  autoFocus?: boolean;
}

/**
 * WhatsApp field: the flag picks the country code, and the number is formatted as it is typed.
 * Typing stops at the country's length; a pasted "+55 31 …" switches to its country.
 */
export function PhoneInput({ id, label, hint, error, value, onChange, autoFocus }: PhoneInputProps) {
  const country = countryByIso(value.iso);
  const Flag = FLAGS[country.iso];
  const formatted = formatPhone(country, value.digits);
  const field = useRef<HTMLDivElement>(null);
  const prefix = useRef<HTMLLabelElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // Digits before the caret, restored after the number is reformatted.
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (prefix.current) field.current?.style.setProperty("--phone-prefix", `${prefix.current.offsetWidth}px`);
  }, [country.iso]);

  useLayoutEffect(() => {
    if (caret.current === null || !input.current || document.activeElement !== input.current) return;
    const at = caretAfterDigits(formatted, caret.current);
    input.current.setSelectionRange(at, at);
    caret.current = null;
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const text = target.value;
    const kind = (event.nativeEvent as InputEvent).inputType;
    let digits = text.replace(/\D/g, "");
    let before = text.slice(0, target.selectionStart ?? text.length).replace(/\D/g, "").length;

    // Pasted or autofilled, with the country code: the code picks the country.
    const typed = kind === "insertText" || kind?.startsWith("delete");
    if (!typed && (text.includes("+") || (digits.length > maxDigits(country, digits) && digits.startsWith(country.ddi)))) {
      const parsed = parseInternational(text.includes("+") || country.iso === INTL ? text : `+${digits}`);
      caret.current = parsed.digits.length;
      onChange(parsed);
      return;
    }
    // Erasing a separator erases the digit next to it.
    if (digits === value.digits && text.length < formatted.length) {
      if (kind === "deleteContentBackward" && before > 0) {
        digits = digits.slice(0, before - 1) + digits.slice(before);
        before -= 1;
      } else if (kind === "deleteContentForward") {
        digits = digits.slice(0, before) + digits.slice(before + 1);
      }
    }
    // A full number takes no more digits: the keystroke is dropped where it was typed.
    if (kind === "insertText" && digits.length > maxDigits(country, digits)) {
      const at = caretAfterDigits(formatted, before - 1);
      requestAnimationFrame(() => target.setSelectionRange(at, at));
      return;
    }
    const next = clampDigits(country, digits);
    caret.current = Math.min(before, next.length);
    onChange({ iso: country.iso, digits: next });
  };

  const pickCountry = (iso: string) => {
    const next = countryByIso(iso);
    onChange({ iso: next.iso, digits: clampDigits(next, value.digits) });
    input.current?.focus();
  };

  return (
    <div className="phone-field" ref={field}>
      <label className="phone-field__country" ref={prefix}>
        <span className="phone-field__flag">{Flag ? <Flag aria-hidden="true" /> : <Globe />}</span>
        <span className="phone-field__ddi" aria-hidden="true">+{country.ddi}</span>
        <svg className="phone-field__chevron" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <select aria-label="País do WhatsApp" value={country.iso} onChange={(e) => pickCountry(e.target.value)}>
          {COUNTRIES.map((option) => (
            <option key={option.iso} value={option.iso}>
              {option.ddi ? `${option.name} (+${option.ddi})` : option.name}
            </option>
          ))}
        </select>
      </label>
      <FocusField
        ref={input}
        id={id}
        label={label}
        hint={hint}
        error={error}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={country.example}
        value={formatted}
        onChange={handleChange}
        autoFocus={autoFocus}
        required
      />
    </div>
  );
}
