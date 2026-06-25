export const statusLabel = {
  normal: "정상",
  busy: "바쁨",
  injured: "부상"
};


export function getStatusText(member) {
  if (member.status === "normal") {
    return statusLabel.normal;
  }

  return `
    ${statusLabel[member.status]}
    ~ ${member.statusEndDate || "종료일 없음"}
  `;
}


export function getStatusClass(status) {
  return `
    status-badge
    status-badge--${status}
  `;
}