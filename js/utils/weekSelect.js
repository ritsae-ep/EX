import {
  getWeekKey,
  getWeeksOfMonth
} from "./date.js";

export function initWeekSelect(monthInput, weekSelect) {
  const now = new Date();

  monthInput.value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const weeks = getWeeksOfMonth(
    now.getFullYear(),
    now.getMonth() + 1
  );

  weekSelect.innerHTML = weeks.map(week => {
    return `
      <option value="${week.weekKey}">
        ${week.label}
      </option>
    `;
  }).join("");

  weekSelect.value = getWeekKey();

  return getWeekKey();
}

export function updateWeekSelect(monthInput, weekSelect) {
  const value = monthInput.value;

  if (!value) return getWeekKey();

  const [year, month] = value.split("-").map(Number);
  const weeks = getWeeksOfMonth(year, month);

  weekSelect.innerHTML = weeks.map(week => {
    return `
      <option value="${week.weekKey}">
        ${week.label}
      </option>
    `;
  }).join("");

  const selectedWeekKey = weeks[0]?.weekKey || getWeekKey();

  weekSelect.value = selectedWeekKey;

  return selectedWeekKey;
}