import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CyberJumpMenu from "./Menu.jsx";

describe("Menu", () => {
  it("ne rend rien quand le menu est fermé", () => {
    expect(renderToStaticMarkup(<CyberJumpMenu open={false} />)).toBe("");
  });

  it("rend l'interface principale et l'état de pause", () => {
    const markup = renderToStaticMarkup(
      <CyberJumpMenu
        open
        paused
        matchResult="Vous avez gagné"
        avatar="david"
        isReady
        countdown={5}
        remotePlayersDataState={{
          "remote-1": { avatar: "lucy", ready: true },
        }}
        onStartReady={vi.fn()}
        onReleaseAvatar={vi.fn()}
        onChooseAvatar={vi.fn()}
        onOpenRules={vi.fn()}
        onQuit={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onResume={vi.fn()}
      />,
    );

    expect(markup).toContain("Jeu en pause");
    expect(markup).toContain("Vous avez gagné");
    expect(markup).toContain("Je ne suis plus prêt");
    expect(markup).toContain("Plein écran");
  });
});
