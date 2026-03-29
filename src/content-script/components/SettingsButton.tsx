import settingsIcon from "../player-controls/icons/settings.svg?raw";
import { openSettingsModal } from "./SettingsModal";

interface SettingsButtonProps {
  disabled: boolean;
}

export function SettingsButton({ disabled }: SettingsButtonProps) {
  return (
    <div
      class={`scf-settings-btn${disabled ? " scf-btn-disabled" : ""}`}
      title="Better SC Feed Playback settings"
      onClick={() => !disabled && openSettingsModal()}
    >
      <span dangerouslySetInnerHTML={{ __html: settingsIcon }} />
    </div>
  );
}
