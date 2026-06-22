export function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

export function getWeekKey(){
  const now = new Date();

  const firstDay = new Date(now.getFullYear(), 0, 1);
  const pastDays = Math.floor((now - firstDay) / 86400000);
  const week = Math.ceil((pastDays + firstDay.getDay()+1) / 7);

  return `${now.getFullYear()}-W${week}`;
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