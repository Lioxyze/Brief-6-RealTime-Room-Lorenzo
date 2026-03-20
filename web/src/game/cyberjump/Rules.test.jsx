import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CyberJumpRules from "./Rules.jsx";

describe("Rules", () => {
  it("ne rend rien quand la fenêtre est fermée", () => {
    expect(renderToStaticMarkup(<CyberJumpRules open={false} onClose={vi.fn()} />)).toBe("");
  });

  it("rend la fenêtre de règles quand elle est ouverte", () => {
    const markup = renderToStaticMarkup(
      <CyberJumpRules open onClose={vi.fn()} />,
    );

    expect(markup).toContain("Règles");
    expect(markup).toContain("Fermer");
  });
});