import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CyberJumpHud from "./Hud.jsx";

describe("Hud", () => {
  it("rend le score, la vie et le compte à rebours", () => {
    const markup = renderToStaticMarkup(
      <CyberJumpHud
        score={12}
        countdown={3}
        healthPanels={[
          {
            id: "me",
            name: "Vous",
            avatar: "david",
            health: 2,
            maxHealth: 3,
            side: "left",
            isLocal: true,
          },
        ]}
      />,
    );

    expect(markup).toContain("cyberjump__hud");
    expect(markup).toContain("12");
    expect(markup).toContain("Départ dans 3s");
    expect(markup).toContain("Vous");
  });
});