import { render, type VNode, type ComponentChildren } from "preact";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const onBackdropClick = (e: Event) => {
    if ((e.target as HTMLElement).hasAttribute("data-scf-backdrop")) {
      onClose();
    }
  };

  return (
    <div class="scf-modal-backdrop" data-scf-backdrop onClick={onBackdropClick}>
      <div class="scf-modal-dialog" role="dialog" aria-label={title}>
        <div class="scf-modal-header">
          <h2 class="scf-modal-title">{title}</h2>
          <button type="button" class="scf-modal-close" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div class="scf-modal-body">{children}</div>
      </div>
    </div>
  );
}

/**
 * Mount a modal into a new container appended to document.body.
 * Accepts a render callback that receives the close function, avoiding
 * circular reference boilerplate at call sites. No-op if a modal with
 * this ID already exists.
 */
export function mountModal(id: string, renderFn: (close: () => void) => VNode): void {
  if (document.getElementById(id)) return;
  const container = document.createElement("div");
  container.id = id;
  document.body.appendChild(container);

  const close = () => {
    document.removeEventListener("keydown", onKeydown);
    render(null, container);
    container.remove();
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKeydown);

  render(renderFn(close), container);
}
