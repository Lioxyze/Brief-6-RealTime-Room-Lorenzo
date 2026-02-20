import "../../styles/layout/shell.scss";

export default function Shell({ children }) {
  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          <div className="shell__logo" aria-hidden="true" />
          <div className="shell__title">Twitch Room</div>
        </div>
      </header>

      <main className="shell__main">{children}</main>

      <footer className="shell__footer">
        <span></span>
      </footer>
    </div>
  );
}
