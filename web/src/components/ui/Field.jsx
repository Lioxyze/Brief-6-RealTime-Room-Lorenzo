import "../../styles/components/field.scss";

export default function Field({
  label,
  value,
  onChange,
  placeholder,
  name,
  error = null,
  autoFocus = false,
}) {
  return (
    <label className={`field ${error ? "field--error" : ""}`}>
      <span className="field__label">{label}</span>

      <input
        className="field__input"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        aria-invalid={!!error}
      />

      {error && <span className="field__error">{error}</span>}
    </label>
  );
}
