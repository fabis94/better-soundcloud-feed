export interface ExtensionSettings {
  seekEnabled: boolean;
  seekSeconds: number;
  pipAutoEnabled: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  seekEnabled: true,
  seekSeconds: 30,
  pipAutoEnabled: true,
};
