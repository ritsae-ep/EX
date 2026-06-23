import { auth } from "../core/firebase.js";

import {
  getDateAfterDays
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
  deleteMember,
  listenMembers
} from "../services/memberService.js";

import {
  getWeeklyChecks,
  deleteChecksByMemberId,
  listenWeeklyChecks
} from "../services/checkService.js";

import { 
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  initModalClose
} from "../utils/modal.js";


const logoutBtn = document.querySelector("#logoutBtn");
const memberList = document.querySelector("#memberList");

const adminStatusModal = document.querySelector("#adminStatusModal");
const adminStatusSelect = document.querySelector("#adminStatusSelect");
const adminSaveStatusBtn = document.querySelector("#adminSaveStatusBtn");

const showAllBtn = document.querySelector("#showAllBtn");
const showPendingBtn = document.querySelector("#showPendingBtn");
const showBanBtn = document.querySelector("#showBanBtn");

let memberData = [];
let currentFilter = "all";

const statusLabel = {
  normal: "정상",
  busy: "바쁨",
  injured: "부상"
};

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

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "./login.html";
});

showAllBtn.addEventListener("click", () => {
  currentFilter = "all";
  applyFilters();
});

showPendingBtn.addEventListener("click", () => {
  currentFilter = "pending";
  applyFilters();
});

showBanBtn.addEventListener("click", () => {
  currentFilter = "ban";
  applyFilters();
});

memberSearchInput.addEventListener("input", () => {
  applyFilters();
});

monthInput.addEventListener("change", () => {
  selectedWeekKey = updateWeekSelect(monthInput, weekSelect);
  getMembers();
});

weekSelect.addEventListener("change", () => {
  selectedWeekKey = weekSelect.value;
  getMembers();
});

async function getMembers() {
  const members = await getAllMembers();
  const checks = await getWeeklyChecks(selectedWeekKey);

  const countMap = {};

  checks.forEach((check) => {
    countMap[check.memberId] =
      (countMap[check.memberId] || 0) + 1;
  });

  memberData = members.map(member => ({
    ...member,
    weeklyCount: countMap[member.id] || 0
  }));

  memberData.sort((a, b) =>
    a.nickname.localeCompare(b.nickname, "ko")
  );

  applyFilters();
}


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "./login.html";
    return;
  }

  const member = await getMemberByUid(user.uid);

  if (!member) {
    location.href = "./index.html";
    return;
  }

  currentAdmin = member;
  if (member.role !== "admin") {
    alert("관리자만 접근할 수 있습니다.");
    location.href = "./index.html";
    return;
  }

  if (!isListening) {
    listenMembers(getMembers);
    listenWeeklyChecks(selectedWeekKey, getMembers);
    isListening = true;
  }
});


function renderMembers(members){
  memberList.innerHTML = members.map(member => {

    const statusText =
      member.status === "normal"
        ? "정상"
        : `${statusLabel[member.status]} ~ ${member.statusEndDate || "종료일 없음"}`;


    const warningCount =
      member.warningCount || 0;

    let warningText = "";

    if (warningCount >= 2) {
      warningText = `
        <span class="warning warning--ban">
          🚨 탈퇴 후보 (${warningCount}회)
        </span>
      `;
    } else if (warningCount === 1) {
      warningText = `
        <span class="warning">
          ⚠ 경고 ${warningCount}회
        </span>
      `;
    }


    return `
      <li>
        <strong>${member.nickname}</strong>

        <span>${statusText}</span>
        <span>${member.weeklyCount || 0}/3회</span>

        ${warningText}

        ${
          warningCount > 0
            ? `<button 
                class="reset-warning-btn"
                data-id="${member.id}"
                data-nickname="${member.nickname}">
                경고 초기화
              </button>`
            : ""
        }

        <button 
          class="force-status-btn"
          data-id="${member.id}"
          data-status="${member.status}">
          상태 변경
        </button>

        <span>
          ${member.approved ? "승인됨" : "승인 대기"}
        </span>

        ${
          member.approved
            ? ""
            : `<button class="approve-btn" data-id="${member.id}">
                승인
              </button>`
        }

        ${
          member.role === "admin"
            ? `<span>관리자</span>`
            : `<button 
                class="make-admin-btn"
                data-id="${member.id}"
                data-nickname="${member.nickname}">
                관리자 임명
              </button>`
        }

        <button 
          class="delete-btn"
          data-id="${member.id}"
          data-nickname="${member.nickname}">
          삭제
        </button>
      </li>
    `;
  }).join("");
}

let selectedMemberId = null;
let currentAdmin = null;
let isListening = false;

memberList.addEventListener("click", async(e)=>{
  const button = e.target.closest("button");
  if(!button) return;

  const id = button.dataset.id;
  const nickname = button.dataset.nickname;

  if (!id) return;

  if (button.classList.contains("force-status-btn")) {
    selectedMemberId = id;
    adminStatusSelect.value = button.dataset.status || "normal";
    adminStatusModal.classList.add("open");
    return;
  }

  if (button.classList.contains("reset-warning-btn")) {
    const ok = confirm(
      `${nickname} 회원 경고를 초기화할까요?`
    );

    if (!ok) return;

    await updateMember(id, {
      warningCount: 0
    });

    return;
  }

  if (button.classList.contains("make-admin-btn")) {
    const ok = confirm(`${nickname} 회원을 관리자로 임명할까요?`);

    if (!ok) return;

    await updateMember(id, {
      role: "admin"
    });

    return;
  }

  if(button.classList.contains("approve-btn")){
    await updateMember(id, {
      approved: true
    });
  } else if (button.classList.contains("delete-btn")) {
    if (id === currentAdmin.id) {
      alert("본인 계정은 삭제할 수 없습니다.");
      return;
    }
    const ok = confirm(`정말 ${nickname} 회원을 삭제할까요?`);

    if (!ok) return;

    await deleteChecksByMemberId(id);
    await deleteMember(id);
  }
});

adminSaveStatusBtn.addEventListener("click", async () => {
  if (!selectedMemberId) return;

  const newStatus = adminStatusSelect.value;

  const updateData = {
    status: newStatus
  };

  if (newStatus === "normal") {
    updateData.statusStartDate = null;
    updateData.statusEndDate = null;
    updateData.canChangeStatus = true;
  } else {
    updateData.statusStartDate = serverTimestamp();
    updateData.statusEndDate = getDateAfterDays(30);
  }

  await updateMember(selectedMemberId, updateData);

  selectedMemberId = null;
  adminStatusModal.classList.remove("open");

  alert("관리자 권한으로 상태를 변경했습니다.");
});