import pipIcon from "../player-controls/icons/pip.svg?raw";
import { BridgeMessageType } from "../../shared/types";

interface PipButtonProps {
  visible: boolean;
  disabled: boolean;
}

export function PipButton({ visible, disabled }: PipButtonProps) {
  return (
    <div
      class={`scf-pip-btn${disabled ? " scf-btn-disabled" : ""}`}
      style={{ display: visible ? "" : "none" }}
      title="Toggle Picture-in-Picture"
      onClick={() =>
        !disabled &&
        window.postMessage(
          { type: BridgeMessageType.PlayerCommand, payload: { action: "togglePip" } },
          "*",
        )
      }
    >
      <span dangerouslySetInnerHTML={{ __html: pipIcon }} />
    </div>
  );
}
