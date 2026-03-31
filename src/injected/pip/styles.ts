const WAVEFORM_HEIGHT = 32;

const CSS_VARS = [
  "--primary-color",
  "--secondary-color",
  "--surface-color",
  "--special-color",
] as const;

export function copyThemeVariables(pipDoc: Document): void {
  const computed = getComputedStyle(document.body);
  const html = pipDoc.documentElement;
  for (const name of CSS_VARS) {
    const value = computed.getPropertyValue(name).trim();
    if (value) html.style.setProperty(name, value);
  }
}

export const PIP_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: var(--surface-color, #121212);
    color: var(--primary-color, #fff);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100vh;
    user-select: none;
  }

  .pip-header {
    padding: 12px 16px 8px;
    min-height: 0;
    flex-shrink: 0;
  }

  .pip-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pip-title {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    cursor: pointer;
  }

  .pip-title:hover { text-decoration: underline; }
  .pip-title-text { display: inline-block; }

  .pip-title-text.pip-marquee {
    animation: pip-marquee 8s linear infinite;
  }

  @keyframes pip-marquee {
    0% { transform: translateX(0); }
    10% { transform: translateX(0); }
    90% { transform: translateX(var(--marquee-offset)); }
    100% { transform: translateX(var(--marquee-offset)); }
  }

  .pip-btn-like {
    flex-shrink: 0;
    padding: 4px;
    color: var(--secondary-color, #999);
  }

  .pip-btn-like.pip-liked { color: var(--special-color, #f50); }
  .pip-btn-like svg { width: 18px; height: 18px; }

  .pip-artist {
    font-size: 12px;
    color: var(--secondary-color, #999);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
    cursor: pointer;
  }

  .pip-artist:hover { text-decoration: underline; }

  .pip-artwork-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    min-height: 0;
    overflow: hidden;
  }

  .pip-artwork {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }

  .pip-waveform-wrap {
    padding: 8px 16px 0;
    flex-shrink: 0;
  }

  .pip-waveform {
    width: 100%;
    height: ${WAVEFORM_HEIGHT}px;
    cursor: pointer;
    display: block;
  }

  .pip-time-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
  }

  .pip-time {
    font-size: 11px;
    color: var(--secondary-color, #999);
    font-variant-numeric: tabular-nums;
  }

  .pip-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 8px;
    flex-shrink: 0;
  }

  .pip-btn {
    background: none;
    border: none;
    color: var(--primary-color, #fff);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .pip-btn:hover { background: rgba(128, 128, 128, 0.2); }
  .pip-btn:active { background: rgba(128, 128, 128, 0.3); }

  .pip-btn svg { width: 20px; height: 20px; }
  .pip-btn-play svg { width: 32px; height: 32px; }
  .pip-btn-seek svg { width: 16px; height: 16px; }

  .pip-branding {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 9px;
    color: var(--secondary-color, #999);
    opacity: 0.8;
    padding-bottom: 6px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .pip-branding-icon svg { width: 12px; height: 12px; }
`;
