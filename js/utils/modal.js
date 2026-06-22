export function initModalClose() {
  document.addEventListener("click", (e) => {
    const closeBtn =
      e.target.closest("[data-close-modal]");

    if (!closeBtn) return;
    
    closeBtn
      .closest(".modal")
      .classList.remove("open");

  });

}