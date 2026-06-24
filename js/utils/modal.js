export function initModalClose() {
  document.addEventListener("click", (e) => {
    // 1. 닫기 버튼 클릭
    const closeBtn = e.target.closest("[data-close-modal]");

    if (closeBtn) {
      closeBtn.closest(".modal").classList.remove("open");
      return;
    }

    // 2. 모달 바깥 배경 클릭
    if (e.target.classList.contains("modal")) {
      e.target.classList.remove("open");
    }
  });
}