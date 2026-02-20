import "../../styles/components/button.scss";

export default function Button({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "primary",
  size = "default",
  fullWidth = false,
  className = "",
}) {
  const classes = [
    "btn",
    variant !== "primary" ? `btn--${variant}` : "",
    size !== "default" ? `btn--${size}` : "",
    fullWidth ? "btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
