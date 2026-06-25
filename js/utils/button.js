export function initActiveButtons(selector) {
  const groups = document.querySelectorAll(selector);

  groups.forEach(group => {
    group.addEventListener("click", (e) => {
      const button = e.target.closest("button");

      if (!button) return;

      group
        .querySelectorAll("button")
        .forEach(btn =>
          btn.classList.remove("active")
        );

      button.classList.add("active");
    });
  });
}