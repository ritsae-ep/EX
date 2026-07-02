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
    result = result.filter(member => {
      const nickname = member.nickname.toLowerCase();
      const nicknameInitials = getInitials(member.nickname);

      return (
        nickname.includes(keyword) ||
        nicknameInitials.includes(keyword)
      );
    });
  }

  return result;
}

function getInitials(text) {
  const CHO = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ",
    "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ",
    "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
  ];

  return text
    .split("")
    .map(char => {
      const code = char.charCodeAt(0) - 44032;

      if (code < 0 || code > 11171) {
        return char;
      }

      return CHO[Math.floor(code / 588)];
    })
    .join("");
}