// Dev-only background script: polls extension files for changes and reloads.
// Only active when loaded as an unpacked extension.

const POLL_INTERVAL = 1000;

async function getFileTimestamps(): Promise<Map<string, string>> {
  const files = ["content-script.js", "injected.js", "filter-ui.css", "manifest.json"];
  const stamps = new Map<string, string>();

  for (const file of files) {
    try {
      const url = chrome.runtime.getURL(file);
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      // Use content length + hash-like check as a cheap change detector
      stamps.set(file, String(text.length));
    } catch {
      // file missing, ignore
    }
  }
  return stamps;
}

function mapsEqual(a: Map<string, string>, b: Map<string, string>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (b.get(k) !== v) return false;
  }
  return true;
}

async function watchForChanges(): Promise<void> {
  let previous = await getFileTimestamps();

  setInterval(async () => {
    const current = await getFileTimestamps();
    if (!mapsEqual(previous, current)) {
      previous = current;
      console.log("[SC Feed Filter] Files changed, reloading...");
      chrome.runtime.reload();
    }
  }, POLL_INTERVAL);
}

watchForChanges();
