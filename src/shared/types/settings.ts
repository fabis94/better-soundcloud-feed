export interface ExtensionSettings {
  skipForwardEnabled: boolean;
  skipForwardSeconds: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  skipForwardEnabled: true,
  skipForwardSeconds: 30,
};
