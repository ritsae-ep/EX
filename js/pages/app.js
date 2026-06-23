import { auth } from "../core/firebase.js";
import {
  getTodayKey,
  getWeekKey,
  getPreviousWeekKey,
  getDateAfterDays,
  isDateExpired,
  isDangerCheckDay,
} from "../utils/date.js";

import {
  initWeekSelect,
  updateWeekSelect
} from "../utils/weekSelect.js";

import {
  filterMembers
} from "../utils/filter.js";

import {
  getAllMembers,
  getMemberByUid,
  updateMember,
  listenMembers,
  addWarning,
  markPenaltyChecked
} from "../services/memberService.js";

import {
  getWeeklyChecks,
  getTodayCheck,
  addCheck,
  deleteCheck,
  listenWeeklyChecks
} from "../services/checkService.js";

import { 
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import {
  initModalClose
} from "../utils/modal.js";

const welcomeText = document.querySelector("#welcomeText");
const logoutBtn = document.querySelector("#logoutBtn");
const adminBtn = document.querySelector("#adminBtn");

const showAllBtn = document.querySelector("#showAllBtn");
const showDangerBtn = document.querySelector("#showDangerBtn");

const memberList = document.querySelector("#memberList");

let currentMember = null;
let memberData = [];
let isListening = false;

const statusBtn = document.querySelector("#statusBtn");
const statusModal = document.querySelector("#statusModal");
const statusSelect = document.querySelector("#statusSelect");
const saveStatusBtn = document.querySelector("#saveStatusBtn");

const checkBtn = document.querySelector("#checkBtn");
const checkModal = document.querySelector("#checkModal");
const saveCheckBtn = document.querySelector("#saveCheckBtn");

const rankingBtn =
  document.querySelector("#rankingBtn");

const rankingModal =
  document.querySelector("#rankingModal");

const rankingList =
  document.querySelector("#rankingList");

const closeRankingBtn =
  document.querySelector("#closeRankingBtn");

const statusLabel = {
  normal: "정상",
  busy: "바쁨",
  injured: "부상"
};
const currentStatusText = document.querySelector("#currentStatusText");

const memberSearchInput = document.querySelector("#memberSearchInput");

const monthInput = document.querySelector("#monthInput");
const weekSelect = document.querySelector("#weekSelect");

let selectedWeekKey = initWeekSelect(
  monthInput,
  weekSelect
);

initModalClose();

function applyFilters() {
  const filtered = filterMembers(
    memberData,
    {
      keyword: memberSearchInput.value.trim(),
      filter: currentFilter
    }
  );

  renderMembers(filtered);
}

monthInput.addEventListener("change", () => {
  selectedWeekKey = updateWeekSelect(monthInput, weekSelect);
  getMembers();
});

weekSelect.addEventListener("change", () => {
  selectedWeekKey = weekSelect.value;
  getMembers();
});

function renderRanking(){

  const ranking =
    [...memberData]
      .sort((a,b)=>
        b.weeklyCount - a.weeklyCount
      );


  rankingList.innerHTML =
    ranking.map((member,index)=>{

      const medal =
        index === 0 ? "🥇" :
        index === 1 ? "🥈" :
        index === 2 ? "🥉" :
        `${index + 1}위`;

      return `
        <li>
          <span>${medal}</span>
          <strong>${member.nickname}</strong>
          <span>${member.weeklyCount}회</span>
        </li>
      `;

    }).join("");

}

rankingBtn.addEventListener("click",()=>{

  renderRanking();

  rankingModal.classList.add("open");

});

closeRankingBtn.addEventListener("click",()=>{

  rankingModal.classList.remove("open");

});

async function getMembers() {
  const members = await getAllMembers();
  const checks = await getWeeklyChecks(selectedWeekKey);

  const countMap = {};

  checks.forEach((check) => {
    countMap[check.memberId] = (countMap[check.memberId] || 0) + 1;
  });

  const mergedMembers = members.map((member) => {
    const weeklyCount = countMap[member.id] || 0;

    const isStatusExpired =
      member.status !== "normal" &&
      isDateExpired(member.statusEndDate);

    const realStatus = isStatusExpired ? "normal" : member.status;
    const displayStatus = statusLabel[realStatus];

    return {
      ...member,
      realStatus,
      displayStatus,
      weeklyCount,
      isDanger:
        isDangerCheckDay() &&
        realStatus === "normal" &&
        weeklyCount < 3
    };
  });

  mergedMembers.sort((a, b) =>
    a.nickname.localeCompare(b.nickname, "ko")
  );

  memberData = mergedMembers;
  renderMembers(memberData);
}

showAllBtn.addEventListener("click", () => {
  currentFilter = "all";
  applyFilters();
});

showDangerBtn.addEventListener("click", () => {
  currentFilter = "danger";
  applyFilters();
});

memberSearchInput.addEventListener("input", () => {
  applyFilters();
});

function renderMembers(members) {
  memberList.innerHTML = members.map(member => {

    const warningText =
      member.warningCount > 0
        ? `<span class="warning">
             ⚠ 경고 ${member.warningCount}회
           </span>`
        : "";

    return `
      <li class="${member.isDanger ? "is-danger" : ""}">
        <strong>${member.nickname}</strong>

        <span>${member.displayStatus}</span>

        <span>
          ${member.weeklyCount}/3회
        </span>

        ${warningText}
      </li>
    `;
  }).join("");
}


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "./login.html";
    return;
  }

  const member = await getMemberByUid(user.uid);

  if (!member) {
    location.href = "./nickname.html";
    return;
  }

  currentMember = member;

  if (currentMember.role === "admin") {
    adminBtn.style.display = "block";
  }

  if (!currentMember.approved) {
    document.body.innerHTML = `
      <main class="app">
        <h1>승인 대기중</h1>
        <p>관리자 승인 후 이용할 수 있습니다.</p>
      </main>
    `;
    return;
  }

  welcomeText.textContent = `${currentMember.nickname}님 안녕하세요!`;

  await settleLastWeek();

  if (!isListening) {
    listenMembers(getMembers);
    listenWeeklyChecks(getWeekKey(), getMembers);
    isListening = true;
  }

  console.log("승인된 회원입니다.");
});

adminBtn.addEventListener("click",()=>{
  location.href = "./admin.html";
});

statusBtn.addEventListener("click",()=>{
  if (!currentMember) {
    alert("회원 정보를 불러오는 중입니다.");
    return;
  }

  statusSelect.value = currentMember.status;

  renderCurrentStatus();

  statusModal.classList.add("open");
});

saveStatusBtn.addEventListener("click", async () => {
  if (!currentMember) return;

  const newStatus = statusSelect.value;

  if (newStatus === currentMember.status) {
    alert("이미 같은 상태입니다.");
    return;
  }

  if (
    newStatus === "busy" &&
    currentMember.canChangeStatus === false
  ) {
    alert("바쁨 상태는 운동 기록 1회 전까지 다시 변경할 수 없습니다.");
    return;
  }

  const updateData = {
    status: newStatus
  };

  if (newStatus === "normal") {
    updateData.statusStartDate = null;
    updateData.statusEndDate = null;
  } else {
    updateData.statusStartDate = serverTimestamp();
    updateData.statusEndDate = getDateAfterDays(30);

    if (newStatus === "busy") {
      updateData.canChangeStatus = false;
    }
  }

  await updateMember(currentMember.id, updateData);

  currentMember = {
    ...currentMember,
    ...updateData
  };

  alert("상태 변경 완료");
  renderCurrentStatus();
  statusModal.classList.remove("open");
});

function renderCurrentStatus(){
  currentStatusText.textContent =
    currentMember.status === "normal"
      ? "현재 상태: 정상"
      : `현재 상태: ${statusLabel[currentMember.status]}
        (${currentMember.statusEndDate}까지)`;
}

checkBtn.addEventListener("click",()=>{
  if(!currentMember) return;

  checkModal.classList.add("open");
});

saveCheckBtn.addEventListener("click", async()=>{
  if(!currentMember) return;

  const todayCheck = await getTodayCheck(
    currentMember.id,
    getTodayKey()
  );

  if (todayCheck) {
    alert("오늘은 이미 기록했습니다.");
    return;
  }

  await addCheck(
    currentMember,
    getTodayKey(),
    getWeekKey()
  );

  await updateMember(currentMember.id, {
    canChangeStatus: true
  });

  currentMember.canChangeStatus = true;

  alert("운동 기록 완료");
  checkModal.classList.remove("open");
});

const deleteTodayCheckBtn = document.querySelector("#deleteTodayCheckBtn");

deleteTodayCheckBtn.addEventListener("click", async () => {
  if (!currentMember) return;

  const todayCheck = await getTodayCheck(
    currentMember.id,
    getTodayKey()
  );

  if (!todayCheck) {
    alert("오늘 삭제할 기록이 없습니다.");
    return;
  }

  const ok = confirm("오늘 운동 기록을 삭제할까요?");
  if (!ok) return;

  await deleteCheck(todayCheck.id);

  alert("운동 기록 삭제 완료");
  checkModal.classList.remove("open");
});

logoutBtn.addEventListener("click", async()=>{
  await signOut(auth);
  location.href="./login.html";
});

async function settleLastWeek() {
  const previousWeekKey = getPreviousWeekKey();

  const members = await getAllMembers();
  const checks = await getWeeklyChecks(previousWeekKey);

  const countMap = {};

  checks.forEach((check) => {
    countMap[check.memberId] =
      (countMap[check.memberId] || 0) + 1;
  });

  for (const member of members) {
    if (!member.approved) continue;

    if (member.lastPenaltyWeek === previousWeekKey) {
      continue;
    }

    if (member.createdAt) {
      const createdAt = member.createdAt.toDate();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (createdAt > sevenDaysAgo) {
        await markPenaltyChecked(member.id, previousWeekKey);
        continue;
      }
    }

    const weeklyCount = countMap[member.id] || 0;

    const isExempt =
      member.status === "busy" ||
      member.status === "injured";

    if (!isExempt && weeklyCount < 3) {
      await addWarning(member.id, previousWeekKey);
    } else {
      await markPenaltyChecked(member.id, previousWeekKey);
    }
  }
}