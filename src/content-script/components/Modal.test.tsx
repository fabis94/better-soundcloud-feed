// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "@voidzero-dev/vite-plus-test";
import { Modal, mountModal } from "./Modal";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("mountModal", () => {
  it("creates a modal appended to body", () => {
    mountModal("test-modal", (close) => (
      <Modal title="Test" onClose={close}>
        <p>Hello</p>
      </Modal>
    ));
    expect(document.getElementById("test-modal")).not.toBeNull();
  });

  it("contains backdrop, dialog, title, close button, and body content", () => {
    mountModal("test-modal", (close) => (
      <Modal title="My Title" onClose={close}>
        <p>Body</p>
      </Modal>
    ));
    const modal = document.getElementById("test-modal")!;
    expect(modal.querySelector("[data-scf-backdrop]")).not.toBeNull();
    expect(modal.querySelector(".scf-modal-dialog")).not.toBeNull();
    expect(modal.querySelector(".scf-modal-title")!.textContent).toBe("My Title");
    expect(modal.querySelector(".scf-modal-close")).not.toBeNull();
    expect(modal.querySelector(".scf-modal-body p")!.textContent).toBe("Body");
  });

  it("no-ops for duplicate IDs", () => {
    mountModal("dup", (close) => (
      <Modal title="A" onClose={close}>
        A
      </Modal>
    ));
    mountModal("dup", (close) => (
      <Modal title="B" onClose={close}>
        B
      </Modal>
    ));
    expect(document.querySelectorAll("#dup").length).toBe(1);
  });

  it("closes when X button is clicked", () => {
    mountModal("close-test", (close) => (
      <Modal title="T" onClose={close}>
        X
      </Modal>
    ));
    document.querySelector<HTMLElement>(".scf-modal-close")!.click();
    expect(document.getElementById("close-test")).toBeNull();
  });

  it("closes when backdrop is clicked", () => {
    mountModal("backdrop-test", (close) => (
      <Modal title="T" onClose={close}>
        X
      </Modal>
    ));
    document.querySelector<HTMLElement>("[data-scf-backdrop]")!.click();
    expect(document.getElementById("backdrop-test")).toBeNull();
  });

  it("does NOT close when clicking inside the dialog", () => {
    mountModal("dialog-test", (close) => (
      <Modal title="T" onClose={close}>
        X
      </Modal>
    ));
    document.querySelector<HTMLElement>(".scf-modal-dialog")!.click();
    expect(document.getElementById("dialog-test")).not.toBeNull();
  });

  it("closes on Escape key", () => {
    mountModal("esc-test", (close) => (
      <Modal title="T" onClose={close}>
        X
      </Modal>
    ));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.getElementById("esc-test")).toBeNull();
  });

  it("has dialog role and aria-label", () => {
    mountModal("aria-test", (close) => (
      <Modal title="Accessible Title" onClose={close}>
        X
      </Modal>
    ));
    const dialog = document.querySelector("[role='dialog']")!;
    expect(dialog.getAttribute("aria-label")).toBe("Accessible Title");
  });
});
