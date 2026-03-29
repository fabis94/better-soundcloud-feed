import type { PlayerCommand, PlayerCommandMessage } from "../../shared/types";
import seekForwardIcon from "../player-controls/icons/seek-forward.svg?raw";
import seekBackwardIcon from "../player-controls/icons/seek-backward.svg?raw";

const SEEK_CONFIG: Record<
  PlayerCommand["action"],
  { icon: string; title: string; className: string }
> = {
  seekForward: { icon: seekForwardIcon, title: "Seek forward", className: "scf-seek-forward" },
  seekBackward: { icon: seekBackwardIcon, title: "Seek backward", className: "scf-seek-backward" },
};

interface SeekButtonProps {
  direction: PlayerCommand["action"];
  visible: boolean;
  playerReady: boolean;
}

export function SeekButton({ direction, visible, playerReady }: SeekButtonProps) {
  const { icon, title, className } = SEEK_CONFIG[direction];
  const disabled = !playerReady;

  const onClick = () => {
    const msg: PlayerCommandMessage = {
      type: "SC_PLAYER_COMMAND",
      payload: { action: direction },
    };
    window.postMessage(msg, "*");
  };

  return (
    <button
      type="button"
      class={`skipControl sc-ir playControls__control sc-button sc-button-secondary sc-button-large sc-button-icon sc-mr-2x ${className}${disabled ? " scf-btn-disabled" : ""}`}
      style={{ marginLeft: "-12px", display: visible ? "" : "none" }}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      <div dangerouslySetInnerHTML={{ __html: icon }} />
    </button>
  );
}
