import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CyberJumpGame from "./Game.jsx";

describe("Game", () => {
  it("rend la zone principale du jeu", () => {
    const markup = renderToStaticMarkup(
      <CyberJumpGame socket={null} room="room-1" />,
    );

    expect(markup).toContain("CyberJump");
    expect(markup).toContain("cyberjump__playfield");
  });
});
