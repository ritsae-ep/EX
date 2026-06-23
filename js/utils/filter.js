export function filterMembers(
  members,
  {
    keyword = "",
    filter = "all"
  }
) {

  let result = [...members];

  if (filter === "danger") {
    result = result.filter(member =>
      member.isDanger
    );
  }

  if (filter === "pending") {
    result = result.filter(member =>
      !member.approved
    );
  }

  if (filter === "ban") {
    result = result.filter(member =>
      (member.warningCount || 0) >= 2
    );
  }


  if (keyword) {
    const lowerKeyword =
      keyword.toLowerCase();

    result = result.filter(member =>
      member.nickname
        .toLowerCase()
        .includes(lowerKeyword)
    );
  }

  return result;
}