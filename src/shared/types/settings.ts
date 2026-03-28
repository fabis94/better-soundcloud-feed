export interface ExtensionSettings {
  skipForwardEnabled: boolean;
  skipForwardSeconds: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  skipForwardEnabled: false,
  skipForwardSeconds: 30,
};
