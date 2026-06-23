export function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getWeekKeyByDate(date) {
  const firstDay = new Date(
    date.getFullYear(),
    0,
    1
  );

  const pastDays = Math.floor(
    (date - firstDay) / 86400000
  );

  const week = Math.ceil(
    (pastDays + firstDay.getDay() + 1) / 7
  );

  return `${date.getFullYear()}-W${week}`;
}

export function getWeekKey() {
  return getWeekKeyByDate(new Date());
}

export function getDateAfterDays(days) {
  const date = new Date();

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isDateExpired(dateKey) {
  if (!dateKey) return false;

  const today = getTodayKey();

  return today > dateKey;
}

export function isDangerCheckDay(){

  const day = new Date().getDay();

  // 0 일요일
  // 1 월요일
  // ...
  // 5 금요일

  return day >= 5 || day === 0;
}

export function getPreviousWeekKey() {
  const date = new Date();

  date.setDate(date.getDate() - 7);

  return getWeekKeyByDate(date);
}

export function getWeeksOfMonth(year, month) {
  const weeks = [];
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    const weekKey = getWeekKeyByDate(date);

    if (!weeks.some(item => item.weekKey === weekKey)) {
      weeks.push({
        label: `${weeks.length + 1}주차`,
        weekKey
      });
    }

    date.setDate(date.getDate() + 1);
  }

  return weeks;
}