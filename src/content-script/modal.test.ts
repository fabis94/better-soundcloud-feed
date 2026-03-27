// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "@voidzero-dev/vite-plus-test";
import { openModal } from "./modal";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("openModal", () => {
  it("creates a modal appended to body", () => {
    const container = openModal({ id: "test-modal", title: "Test", content: "<p>Hello</p>" });
    expect(container).not.toBeNull();
    expect(document.getElementById("test-modal")).not.toBeNull();
  });

  it("contains backdrop, dialog, title, close button, and body content", () => {
    openModal({ id: "test-modal", title: "My Title", content: "<p>Body</p>" });
    const modal = document.getElementById("test-modal")!;
    expect(modal.querySelector("[data-scf-backdrop]")).not.toBeNull();
    expect(modal.querySelector(".scf-modal-dialog")).not.toBeNull();
    expect(modal.querySelector(".scf-modal-title")!.textContent).toBe("My Title");
    expect(modal.querySelector(".scf-modal-close")).not.toBeNull();
    expect(modal.querySelector(".scf-modal-body p")!.textContent).toBe("Body");
  });

  it("returns null for duplicate IDs", () => {
    openModal({ id: "dup", title: "A", content: "" });
    const second = openModal({ id: "dup", title: "B", content: "" });
    expect(second).toBeNull();
    expect(document.querySelectorAll("#dup").length).toBe(1);
  });

  it("closes when X button is clicked", () => {
    openModal({ id: "close-test", title: "T", content: "" });
    document.querySelector<HTMLElement>(".scf-modal-close")!.click();
    expect(document.getElementById("close-test")).toBeNull();
  });

  it("closes when backdrop is clicked", () => {
    openModal({ id: "backdrop-test", title: "T", content: "" });
    document.querySelector<HTMLElement>("[data-scf-backdrop]")!.click();
    expect(document.getElementById("backdrop-test")).toBeNull();
  });

  it("does NOT close when clicking inside the dialog", () => {
    openModal({ id: "dialog-test", title: "T", content: "" });
    document.querySelector<HTMLElement>(".scf-modal-dialog")!.click();
    expect(document.getElementById("dialog-test")).not.toBeNull();
  });

  it("closes on Escape key", () => {
    openModal({ id: "esc-test", title: "T", content: "" });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.getElementById("esc-test")).toBeNull();
  });
});
