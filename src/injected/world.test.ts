// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "@voidzero-dev/vite-plus-test";
import { isIsolatedWorld, injectViaScriptTag, detectLoadStyle } from "./world";

function setChromeGlobal(value: unknown): void {
  Object.defineProperty(globalThis, "chrome", { value, configurable: true, writable: true });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "chrome");
});

describe("isIsolatedWorld", () => {
  it("returns false when no chrome global exists (Firefox page world)", () => {
    expect(isIsolatedWorld()).toBe(false);
  });

  it("returns false for a bare chrome object without runtime (Chrome page world)", () => {
    setChromeGlobal({ loadTimes: () => ({}) });
    expect(isIsolatedWorld()).toBe(false);
  });

  it("returns false when runtime exists but has no id (externally connectable page)", () => {
    setChromeGlobal({ runtime: { connect: () => ({}) } });
    expect(isIsolatedWorld()).toBe(false);
  });

  it("returns true when runtime.id is a string (isolated content-script world)", () => {
    setChromeGlobal({ runtime: { id: "abcdefghijklmnop" } });
    expect(isIsolatedWorld()).toBe(true);
  });
});

describe("injectViaScriptTag", () => {
  const extensionRuntime = {
    runtime: {
      id: "abcdefghijklmnop",
      getURL: (path: string) => `chrome-extension://abcdefghijklmnop/${path}`,
    },
  };

  it("prepends a script pointing at the extension's injected.js into <head>", () => {
    setChromeGlobal(extensionRuntime);
    const doc = document.implementation.createHTMLDocument();
    doc.head.appendChild(doc.createElement("meta"));

    const script = injectViaScriptTag(doc);

    expect(script.src).toBe("chrome-extension://abcdefghijklmnop/injected.js");
    expect(doc.head.firstElementChild).toBe(script);
  });

  it("falls back to <html> when <head> does not exist yet", () => {
    setChromeGlobal(extensionRuntime);
    const doc = document.implementation.createHTMLDocument();
    doc.head.remove();
    expect(doc.head).toBeNull();

    const script = injectViaScriptTag(doc);

    expect(doc.documentElement.firstElementChild).toBe(script);
  });

  it("removes the script element once it has loaded", () => {
    setChromeGlobal(extensionRuntime);
    const doc = document.implementation.createHTMLDocument();

    const script = injectViaScriptTag(doc);
    expect(script.isConnected).toBe(true);

    script.dispatchEvent(new Event("load"));
    expect(script.isConnected).toBe(false);
  });
});

describe("detectLoadStyle", () => {
  it("reports main-world content script when no script element is executing", () => {
    const doc = { currentScript: null } as unknown as Document;
    expect(detectLoadStyle(doc)).toBe("main-world-content-script");
  });

  it("reports script-tag fallback when executing from a <script> element", () => {
    const doc = { currentScript: document.createElement("script") } as unknown as Document;
    expect(detectLoadStyle(doc)).toBe("script-tag-fallback");
  });

  it("defaults to the global document, where nothing is executing in tests", () => {
    expect(detectLoadStyle()).toBe("main-world-content-script");
  });
});
