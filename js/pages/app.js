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
  compressImage
} from "../utils/image.js";

import {
  initActiveButtons
} from "../utils/button.js";

import {
  statusLabel,
  getStatusClass
} from "../utils/status.js";

import {
  getAllMembers,
  getMemberByUid,
  updateMember,
  listenMembers,
  addWarning,
  markPenaltyChecked,
  createMember
} from "../services/memberService.js";

import {
  getWeeklyChecks,
  getTodayCheck,
  addCheck,
  deleteCheck,
  listenWeeklyChecks,
  cleanupExpiredPhotos
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

const nicknameModal = document.querySelector("#nicknameModal");
const nicknameInput = document.querySelector("#nicknameInput");
const saveNicknameBtn = document.querySelector("#saveNicknameBtn");

const welcomeText = document.querySelector("#welcomeText");
const logoutBtn = document.querySelector("#logoutBtn");
const adminBtn = document.querySelector("#adminBtn");

const myGreeting = document.querySelector("#myGreeting");
const myStatusText = document.querySelector("#myStatusText");
const myProgressDots = document.querySelector("#myProgressDots");
const myWeeklyCount = document.querySelector("#myWeeklyCount");
const myGoalMessage = document.querySelector("#myGoalMessage");
const todayStatusText = document.querySelector("#todayStatusText");

const dashboardCheckBtn = document.querySelector("#todayCheckBtn");
const dashboardDeleteCheckBtn = document.querySelector("#deleteTodayCheckBtn");

const showAllBtn = document.querySelector("#showAllBtn");
const showDangerBtn = document.querySelector("#showDangerBtn");

const memberList = document.querySelector("#memberList");

let pendingUser = null;
let currentMember = null;
let currentFilter = "all";
let memberData = [];
let isListening = false;

const statusBtn = document.querySelector("#statusBtn");
const statusModal = document.querySelector("#statusModal");
const statusChoiceBtns = document.querySelectorAll(".status-choice__btn");

const checkBtn = dashboardCheckBtn;
const checkModal = document.querySelector("#checkModal");
const saveCheckBtn = document.querySelector("#saveCheckBtn");
const checkPhotoInput = document.querySelector("#checkPhotoInput");

const photoModal = document.querySelector("#photoModal");
const photoPreview = document.querySelector("#photoPreview");

const rankingBtn = document.querySelector("#rankingBtn");
const rankingModal = document.querySelector("#rankingModal");
const rankingList = document.querySelector("#rankingList");
const closeRankingBtn = document.querySelector("#closeRankingBtn");

const currentStatusText = document.querySelector("#currentStatusText");

const memberSearchInput = document.querySelector("#memberSearchInput");

const monthInput = document.querySelector("#monthInput");
const weekSelect = document.querySelector("#weekSelect");

let selectedWeekKey = initWeekSelect(
  monthInput,
  weekSelect
);

initModalClose();
initActiveButtons(".filter");

async function logout() {
  await signOut(auth);
  location.href="./login.html";
}

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

  const currentWeekChecks =
    selectedWeekKey === getWeekKey()
      ? checks
      : await getWeeklyChecks(getWeekKey());

  const todayCheck = currentMember
    ? await getTodayCheck(currentMember.id, getTodayKey())
    : null;
  
  const isCurrentWeek = selectedWeekKey === getWeekKey();

  const countMap = {};
  const photoMap = {};

  checks.forEach((check) => {
    countMap[check.memberId] = (countMap[check.memberId] || 0) + 1;

    if (
      check.dateKey === getTodayKey() &&
      check.photoBase64
    ) {
      photoMap[check.memberId] = check.photoBase64;
    }
  });

  const mergedMembers = members.map((member) => {
    const weeklyCount = countMap[member.id] || 0;

    const isStatusExpired =
      member.status !== "normal" &&
      isDateExpired(member.statusEndDate);

    const realStatus = 
      isDateExpired(member.statusEndDate) ? "normal" : member.status;
    const displayStatus = statusLabel[realStatus];

    return {
      ...member,
      realStatus,
      displayStatus,
      weeklyCount,
      photoBase64: photoMap[member.id] || null,
      isDanger:
        realStatus === "normal" &&
        weeklyCount < 3 &&
        (
          !isCurrentWeek ||
          isDangerCheckDay()
        )
    };
  });

  mergedMembers.sort((a, b) =>
    a.nickname.localeCompare(b.nickname, "ko")
  );

  memberData = mergedMembers;
  renderMyDashboard(checks);
  applyFilters();
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

function getDayIndexFromDateKey(dateKey) {
  const day = new Date(dateKey).getDay();

  // JS: 일 0, 월 1, 화 2 ...
  // 화면: 월 0, 화 1, ... 일 6
  return day === 0 ? 6 : day - 1;
}

function renderMyDashboard(checks) {
  if (!currentMember) return;

  const myChecks = checks.filter(
    check => check.memberId === currentMember.id
  );

  const checkedDays = myChecks.map(check =>
    getDayIndexFromDateKey(check.dateKey)
  );

  const myWeeklyCountValue = myChecks.length;
  const leftCount = Math.max(3 - myWeeklyCountValue, 0);

  const todayCheck = myChecks.find(
    check => check.dateKey === getTodayKey()
  );

  myGreeting.textContent = `👋 ${currentMember.nickname}님`;

  myStatusText.textContent =
    currentMember.status === "normal"
      ? "정상"
      : statusLabel[currentMember.status];

  myProgressDots.innerHTML = Array.from({ length: 7 }, (_, index) => {
    return `
      <span class="${checkedDays.includes(index) ? "is-filled" : ""}"></span>
    `;
  }).join("");

  myWeeklyCount.textContent =
    `이번 주 ${myWeeklyCountValue}회 완료`;

  myGoalMessage.textContent =
    leftCount === 0
      ? "목표 3회 달성 🎯"
      : `${leftCount}회 더 하면 목표 달성 🔥`;

  const hasTodayCheck = myChecks.some(
    check => check.dateKey === getTodayKey()
  );

  if (hasTodayCheck) {
    todayStatusText.textContent = "✅ 오늘 운동 기록 완료";

    dashboardCheckBtn.setAttribute("hidden", "");
    dashboardDeleteCheckBtn.removeAttribute("hidden");
  } else {
    todayStatusText.textContent = "○ 오늘 아직 기록 안 함";

    dashboardCheckBtn.removeAttribute("hidden");
    dashboardDeleteCheckBtn.setAttribute("hidden", "");
  }
}

function renderMembers(members) {
  memberList.innerHTML = members.map(member => {
    const warningCount = member.warningCount || 0;

    const warningText =
      warningCount >= 2
        ? `<span class="member-card__meta member-card__warning--ban">
            🚨 경고 ${warningCount}회
          </span>`
        : warningCount === 1
          ? `<span class="member-card__meta member-card__warning">
              ⚠️ 경고 ${warningCount}회
            </span>`
          : "";

    const dangerBadge =
      member.isDanger
        ? `<span title="기준 미달">⚠️</span>`
        : "";

    return `
      <li class="member-card ${member.isDanger ? "is-danger" : ""}">
        <div class="member-card__top">
          <strong class="member-card__name">
            ${member.nickname}
          </strong>

          <div class="member-card__badges">
            ${dangerBadge}
          </div>
        </div>

        <div class="member-card__body">
          <span class="member-card__meta ${getStatusClass(member.status)}">
            ${member.displayStatus}
          </span>

          <span class="member-card__meta">
            ${member.weeklyCount} / 3회
          </span>

          ${warningText}
        </div>
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
    pendingUser = user;
    nicknameModal.classList.add("open");
    return;
  }

  currentMember = member;

  if (currentMember.role === "admin") {
    adminBtn.style.display = "block";
  }

  if (!currentMember.approved) {
    document.body.innerHTML = `
      <main class="auth-page">
        <section class="auth-card">
          <h1 class="auth-card__title">
            승인 대기중
          </h1>

          <p class="auth-card__desc">
            관리자 승인 후 이용할 수 있습니다.
          </p>

          <button id="logoutBtn" class="auth-btn">
            로그아웃
          </button>
        </section>
      </main>
    `;

    document
    .querySelector("#logoutBtn")
    .addEventListener("click", logout);
    
    return;
  }

  welcomeText.textContent = `${currentMember.nickname}님 안녕하세요!`;

  await cleanupExpiredPhotos();
  await settleLastWeek();

  if (!isListening) {
    listenMembers(getMembers);
    listenWeeklyChecks(getWeekKey(), getMembers);
    isListening = true;
  }

  console.log("승인된 멤버입니다.");
});

adminBtn.addEventListener("click",()=>{
  location.href = "./admin.html";
});

statusBtn.addEventListener("click",()=>{
  if (!currentMember) {
    alert("멤버 정보를 불러오는 중입니다.");
    return;
  }

  renderCurrentStatus();
  statusModal.classList.add("open");
});

statusChoiceBtns.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!currentMember) return;

    const newStatus = button.dataset.status;

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

    await getMembers();
  });
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

  const file =
  checkPhotoInput.files[0];

  if (!file) {
    alert("운동 인증 사진을 등록해주세요.");
    return;
  }

  let photoBase64 = "";

  try {
    photoBase64 = await compressImage(file);
  } catch (error) {
    if (error.message === "IMAGE_TOO_LARGE") {
      alert("사진 용량이 너무 큽니다. 다른 사진으로 다시 시도해주세요.");
      return;
    }

    alert("사진을 처리하지 못했습니다. 다시 시도해주세요.");
    return;
  }

  await addCheck(
    currentMember,
    getTodayKey(),
    getWeekKey(),
    photoBase64
  );

  await updateMember(currentMember.id, {
    canChangeStatus: true
  });

  currentMember.canChangeStatus = true;

  alert("운동 기록 완료");
  checkModal.classList.remove("open");
  checkPhotoInput.value = "";

  console.log("저장 완료");
  await getMembers();
});

dashboardDeleteCheckBtn.addEventListener("click", async () => {
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
  await getMembers();
});

logoutBtn.addEventListener("click", logout);

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

memberList.addEventListener("click", (e) => {
  const button = e.target.closest(".photo-view-btn");
  if (!button) return;

  photoPreview.src = button.dataset.photo;
  photoModal.classList.add("open");
});

saveNicknameBtn.addEventListener("click", async () => {
  if (!pendingUser) return;

  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    alert("닉네임을 입력해주세요.");
    return;
  }

  await createMember(pendingUser, nickname);

  alert("가입 완료! 관리자 승인 후 이용할 수 있습니다.");

  location.reload();
});