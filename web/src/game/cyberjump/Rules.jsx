// Composant affichant les règles du jeu. Le texte est conservé dans
// `RULES_TEXT` pour faciliter la lecture et la traduction.
const RULES_TEXT = `Dans ce duel en face-à-face,
votre but est de rester en vie en évitant Faraday,
votre redoutable adversaire.

JOUEUR :
- Se déplacer : Q / D (ou A / D)
- Sauter : Z (ou W) / Espace
- Tirer un robot : clic souris ou bouton 🤖

Le saut est plus maniable :
- Maintenir la touche = saut plus haut
- Relâcher rapidement = petit saut
- Double saut autorisé

Le duel n'utilise plus d'ennemis automatiques : le but est d'envoyer vos robots sur l'autre joueur.

Astuce : si besoin, faites CTRL + molette pour ajuster le zoom.`;

export default function CyberJumpRules({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="cyberjump__rules" role="dialog" aria-modal="true">
      <div className="cyberjump__rules-content">
        <button
          className="cyberjump__rules-close"
          type="button"
          aria-label="Fermer"
          onClick={onClose}
        >
          ×
        </button>

        <h4 className="cyberjump__rules-title">Règles</h4>

        <pre className="cyberjump__rules-text">{RULES_TEXT}</pre>
      </div>
    </div>
  );
}
