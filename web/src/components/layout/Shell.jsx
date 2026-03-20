import "../../styles/layout/shell.scss";

export default function Shell({ children }) {
  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          <div className="shell__logo" aria-hidden="true" />
          <div className="shell__title">CyberJump</div>
        </div>
      </header>

      <main className="shell__main">{children}</main>

      <footer className="shell__footer">
        <div className="shell__footer-inner">
          <div className="shell__footer-left">© 2026 CyberJump</div>
          <div className="shell__footer-center">
            <a href="#" className="shell__link">
              About
            </a>
            <a href="#" className="shell__link">
              Contact
            </a>
            <a href="#" className="shell__link">
              Privacy
            </a>
          </div>
          <div className="shell__footer-right">Made with Lioxyze</div>
        </div>
      </footer>
    </div>
  );
}
