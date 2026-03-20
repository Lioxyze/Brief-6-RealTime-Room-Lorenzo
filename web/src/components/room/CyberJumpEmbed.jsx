import CyberJumpGame from "../../game/cyberjump/Game.jsx";

export default function CyberJumpEmbed(props) {
  return (
    <div className="room__game">
      <CyberJumpGame {...props} />
    </div>
  );
}
