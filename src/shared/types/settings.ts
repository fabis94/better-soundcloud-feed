export interface ExtensionSettings {
  seekEnabled: boolean;
  seekSeconds: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  seekEnabled: true,
  seekSeconds: 30,
};
