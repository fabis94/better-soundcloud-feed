// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "@voidzero-dev/vite-plus-test";
import { openHelpModal } from "./help-modal";

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
    expect(modal.querySelector("#scf-help-backdrop")).not.toBeNull();
    expect(modal.querySelector(".scf-help-dialog")).not.toBeNull();
    expect(modal.querySelector("#scf-help-close")).not.toBeNull();
    expect(modal.querySelectorAll(".scf-help-section").length).toBeGreaterThan(0);
  });

  it("does not open a second modal if one already exists", () => {
    openHelpModal();
    openHelpModal();
    const modals = document.querySelectorAll("#scf-help-modal");
    expect(modals.length).toBe(1);
  });

  it("removes modal when close button is clicked", () => {
    openHelpModal();
    const closeBtn = document.querySelector<HTMLElement>("#scf-help-close")!;
    closeBtn.click();
    expect(document.getElementById("scf-help-modal")).toBeNull();
  });

  it("removes modal when backdrop is clicked", () => {
    openHelpModal();
    const backdrop = document.querySelector<HTMLElement>("#scf-help-backdrop")!;
    backdrop.click();
    expect(document.getElementById("scf-help-modal")).toBeNull();
  });

  it("does NOT close when clicking inside the dialog", () => {
    openHelpModal();
    const dialog = document.querySelector<HTMLElement>(".scf-help-dialog")!;
    dialog.click();
    expect(document.getElementById("scf-help-modal")).not.toBeNull();
  });

  it("removes modal when Escape is pressed", () => {
    openHelpModal();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.getElementById("scf-help-modal")).toBeNull();
  });

  it("cleans up Escape listener after close", () => {
    openHelpModal();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    // Should not throw when pressing Escape again with no modal
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.getElementById("scf-help-modal")).toBeNull();
  });
});
