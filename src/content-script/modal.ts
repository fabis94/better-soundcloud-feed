interface ModalOptions {
  id: string;
  title: string;
  content: string;
}

/**
 * Open a modal dialog with backdrop, close button, click-outside, and Escape support.
 * Returns the container element, or `null` if a modal with this ID is already open.
 */
export function openModal(opts: ModalOptions): HTMLElement | null {
  if (document.getElementById(opts.id)) return null;

  const container = document.createElement("div");
  container.id = opts.id;
  container.innerHTML = `
<div class="scf-modal-backdrop" data-scf-backdrop>
  <div class="scf-modal-dialog" role="dialog" aria-label="${opts.title}">
    <div class="scf-modal-header">
      <h2 class="scf-modal-title">${opts.title}</h2>
      <button type="button" class="scf-modal-close" aria-label="Close">&times;</button>
    </div>
    <div class="scf-modal-body">
      ${opts.content}
    </div>
  </div>
</div>
`;
  document.body.appendChild(container);

  const backdrop = container.querySelector<HTMLElement>("[data-scf-backdrop]")!;
  const closeBtn = container.querySelector<HTMLElement>(".scf-modal-close")!;

  const close = () => container.remove();

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKeydown);
    }
  };
  document.addEventListener("keydown", onKeydown);

  return container;
}
