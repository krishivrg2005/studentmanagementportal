const storageKey = "student-portal-theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const button = document.getElementById("theme-toggle");
  if (!button) {
    return;
  }

  const icon = button.querySelector(".theme-toggle-icon");
  const label = button.querySelector(".theme-toggle-label");
  const isDark = theme === "dark";

  button.setAttribute("aria-pressed", String(isDark));
  if (icon) {
    icon.textContent = isDark ? "☾" : "☀";
  }
  if (label) {
    label.textContent = isDark ? "Dark" : "Light";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const initialTheme = document.documentElement.dataset.theme || "light";
  applyTheme(initialTheme);

  const button = document.getElementById("theme-toggle");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  });
});
