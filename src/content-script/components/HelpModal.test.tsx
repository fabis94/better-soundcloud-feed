// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "@voidzero-dev/vite-plus-test";
import { openHelpModal } from "./HelpModal";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("openHelpModal", () => {
  it("creates a modal with the correct id appended to body", () => {
    openHelpModal();
    const modal = document.getElementById("scf-help-modal");
    expect(modal).not.toBeNull();
    expect(modal!.parentElement).toBe(document.body);
  });

  it("contains backdrop, dialog, close button, and help sections", () => {
    openHelpModal();
    const modal = document.getElementById("scf-help-modal")!;
    expect(modal.querySelector("[data-scf-backdrop]")).not.toBeNull();
    expect(modal.querySelector(".scf-modal-dialog")).not.toBeNull();
    expect(modal.querySelector(".scf-modal-close")).not.toBeNull();
    expect(modal.querySelectorAll(".scf-modal-section").length).toBeGreaterThan(0);
  });

  it("does not open a second modal if one already exists", () => {
    openHelpModal();
    openHelpModal();
    const modals = document.querySelectorAll("#scf-help-modal");
    expect(modals.length).toBe(1);
  });

  it("removes modal when close button is clicked", () => {
    openHelpModal();
    document.querySelector<HTMLElement>(".scf-modal-close")!.click();
    expect(document.getElementById("scf-help-modal")).toBeNull();
  });

  it("removes modal when backdrop is clicked", () => {
    openHelpModal();
    document.querySelector<HTMLElement>("[data-scf-backdrop]")!.click();
    expect(document.getElementById("scf-help-modal")).toBeNull();
  });

  it("does NOT close when clicking inside the dialog", () => {
    openHelpModal();
    document.querySelector<HTMLElement>(".scf-modal-dialog")!.click();
    expect(document.getElementById("scf-help-modal")).not.toBeNull();
  });

  it("removes modal when Escape is pressed", () => {
    openHelpModal();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.getElementById("scf-help-modal")).toBeNull();
  });

  it("includes a feedback link pointing at the GitHub issues page", () => {
    openHelpModal();
    const modal = document.getElementById("scf-help-modal")!;
    const link = modal.querySelector<HTMLAnchorElement>('a[href*="/issues"]');
    expect(link).not.toBeNull();
    expect(link!.target).toBe("_blank");
    expect(link!.rel).toContain("noopener");
  });
});
