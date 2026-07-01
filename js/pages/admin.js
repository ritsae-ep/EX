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
  listenMembers,
  addAdminWarning
} from "../services/memberService.js";

import {
  addAdminCheck,
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

import {
  getStatusText,
  getStatusClass
} from "../utils/status.js";

const logoutBtn = document.querySelector("#logoutBtn");

const dangerMemberList = document.querySelector("#dangerMemberList");
const pendingMemberList = document.querySelector("#pendingMemberList");
const memberList = document.querySelector("#memberList");

const excelDownloadBtn = document.querySelector("#excelDownloadBtn");

const adminStatusModal = document.querySelector("#adminStatusModal");
const adminStatusTitle = document.querySelector("#adminStatusTitle");
const adminStatusSelect = document.querySelector("#adminStatusSelect");
const adminSaveStatusBtn = document.querySelector("#adminSaveStatusBtn");

const adminCheckModal = document.querySelector("#adminCheckModal");
const adminCheckTitle = document.querySelector("#adminCheckTitle");
const adminCheckDate = document.querySelector("#adminCheckDate");
const adminCheckSaveBtn = document.querySelector("#adminCheckSaveBtn");

const photoModal = document.querySelector("#photoModal");
const photoList = document.querySelector("#photoList");

let memberData = [];

const memberSearchInput = document.querySelector("#memberSearchInput");

const monthInput = document.querySelector("#monthInput");
const weekSelect = document.querySelector("#weekSelect");
let selectedWeekKey = initWeekSelect(
  monthInput,
  weekSelect
);

initModalClose();

function applyFilters() {
  renderMembers(memberData);
}

memberSearchInput.addEventListener("input", () => {
  applyFilters();
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "./login.html";
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
  const photoMap = {};

  checks.forEach((check) => {
    countMap[check.memberId] =
      (countMap[check.memberId] || 0) + 1;

    if (check.photoBase64) {
      if (!photoMap[check.memberId]) {
        photoMap[check.memberId] = [];
      }

      photoMap[check.memberId].push({
        dateKey: check.dateKey,
        photo: check.photoBase64
      });
    }
  });

  memberData = members.map(member => ({
    ...member,
    
    weeklyCount:
      countMap[member.id] || 0,

    photos:
      photoMap[member.id] || []
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


function renderMembers(members) {
  const keyword = memberSearchInput.value.trim();

  const searchedMembers = keyword
    ? filterMembers(members, {
        keyword,
        filter: "all"
      })
    : members;

  const dangerMembers = filterMembers(searchedMembers, {
    filter: "danger"
  });

  const banMembers = filterMembers(searchedMembers, {
    filter: "ban"
  });

  const needCareMembers = [
    ...dangerMembers,
    ...banMembers
  ].filter((member, index, array) =>
    array.findIndex(item => item.id === member.id) === index
  );

  const pendingMembers = filterMembers(searchedMembers, {
    filter: "pending"
  });

  const approvedMembers = searchedMembers.filter(member =>
    member.approved
  );

  dangerMemberList.innerHTML =
    needCareMembers.length
      ? needCareMembers.map(renderAdminMemberCard).join("")
      : `<li class="admin-card admin-card--empty">관리 필요한 멤버가 없습니다.</li>`;

  pendingMemberList.innerHTML =
    pendingMembers.length
      ? pendingMembers.map(renderAdminMemberCard).join("")
      : `<li class="admin-card admin-card--empty">승인 요청이 없습니다.</li>`;

  memberList.innerHTML =
    approvedMembers.length
      ? approvedMembers.map(renderAdminMemberCard).join("")
      : `<li class="admin-card admin-card--empty">멤버가 없습니다.</li>`;
}

function renderAdminMemberCard(member) {
  const statusText = getStatusText(member);

  const badges = [
    member.isDanger
      ? `<span class="admin-card__badge" title="기준 미달">⚠️</span>`
      : "",

    (member.warningCount || 0) >= 2
      ? `<span class="admin-card__badge" title="추방 후보">🔴</span>`
      : "",

    !member.approved
      ? `<span class="admin-card__badge" title="승인 대기">🟡</span>`
      : "",

    member.photos.length > 0
      ? `<button
          type="button"
          class="admin-card__badge admin-card__photo photo-view-btn"
          title="인증 사진 보기"
          data-id="${member.id}">
          🖼️
        </button>`
      : "",

    member.role === "admin"
      ? `<span class="admin-card__badge" title="관리자">👑</span>`
      : ""
  ].join("");

  const warningText =
    (member.warningCount || 0) > 0
      ? `<span class="admin-card__warning">
          경고 ${member.warningCount}회
        </span>`
      : "";

  const approveButton =
    !member.approved
      ? `
        <button
          class="approve-btn admin-card__button admin-card__button--primary"
          data-id="${member.id}"
          data-nickname="${member.nickname}">
          승인
        </button>
      `
      : "";

  return `
    <li class="admin-card ${member.isDanger ? "is-danger" : ""}">
      <div class="admin-card__top">
        <div class="admin-card__name">
          <strong>${member.nickname}</strong>
          <div class="admin-card__badges">
            ${badges}
          </div>
        </div>
      </div>

      <div class="admin-card__body">
        <div class="admin-card__meta">
          <span>이번 주</span>
          <strong>${member.weeklyCount}/3회</strong>
        </div>

        <div class="admin-card__meta">
          <span>상태</span>
          <strong class="${getStatusClass(member.status)}">
            ${statusText}
          </strong>
        </div>

        ${
          warningText
            ? `<div class="admin-card__meta">
                <span>경고</span>
                ${warningText}
              </div>`
            : ""
        }
      </div>

      <div class="admin-card__actions">
        ${approveButton}

        <button
          class="admin-check-btn admin-card__button admin-card__button--primary"
          data-id="${member.id}"
          data-nickname="${member.nickname}">
          인증 추가
        </button>

        <button
          class="force-status-btn admin-card__button admin-card__button--normal"
          data-id="${member.id}"
          data-nickname="${member.nickname}"
          data-status="${member.status}">
          상태 변경
        </button>

        <div class="admin-card__more">
          <button
            type="button"
            class="more-btn admin-card__button admin-card__button--normal">
            ⋮ 관리
          </button>

          <div class="more-menu">
            <button
              class="add-warning-btn admin-card__button admin-card__button--warning"
              data-id="${member.id}"
              data-nickname="${member.nickname}">
              경고 부여
            </button>

            <button
              class="reset-warning-btn admin-card__button admin-card__button--warning"
              data-id="${member.id}"
              data-nickname="${member.nickname}">
              경고 초기화
            </button>

            <hr>

            <button
              class="delete-btn admin-card__button admin-card__button--danger"
              data-id="${member.id}"
              data-nickname="${member.nickname}"
              data-role="${member.role}">
              멤버 삭제
            </button>

            <button
              class="make-admin-btn admin-card__button admin-card__button--black"
              data-id="${member.id}"
              data-nickname="${member.nickname}">
              관리자 임명
            </button>
          </div>
        </div>
      </div>
    </li>
  `;
}

let selectedMemberId = null;
let currentAdmin = null;
let isListening = false;
let selectedadminCheckMember = null;


function handleAdminListClick(e) {
  handleAdminAction(e);
}

dangerMemberList.addEventListener("click", handleAdminListClick);
pendingMemberList.addEventListener("click", handleAdminListClick);
memberList.addEventListener("click", handleAdminListClick);


async function handleAdminAction(e) {
  const button = e.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const nickname = button.dataset.nickname;
  const role = button.dataset.role;

  if (!id) return;

  if (button.classList.contains("photo-view-btn")) {
    const member = memberData.find(member =>
      member.id === id
    );

    photoList.innerHTML = member.photos.map(item => {
      return `
        <div class="photo-item">
          <p>${item.dateKey}</p>
          <img src="${item.photo}" style="max-width:100%;">
        </div>
      `;
    }).join("");

    photoModal.classList.add("open");
    return;
  }

  if (button.classList.contains("force-status-btn")) {
    selectedMemberId = id;
    adminStatusTitle.textContent = `${nickname}님의 상태를 변경합니다`;
    adminStatusSelect.value = button.dataset.status || "normal";
    adminStatusModal.classList.add("open");
    return;
  }

  if (button.classList.contains("admin-check-btn")) {
    selectedadminCheckMember = {
      id,
      nickname
    };

    adminCheckTitle.textContent = `${nickname}님의 인증을 추가합니다`;

    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    adminCheckDate.value = todayKey;
    adminCheckDate.max = todayKey;
    adminCheckDate.min = sevenDaysAgo.toISOString().slice(0, 10);

    adminCheckModal.classList.add("open");
    return;
  }

  if (button.classList.contains("add-warning-btn")) {
    const ok = confirm(
      `${nickname} 에게 경고를 1회 부여할까요?`
    );

    if (!ok) return;

    await addAdminWarning(id);

    return;
  }

  if (button.classList.contains("reset-warning-btn")) {
    const ok = confirm(
      `${nickname} 의 경고를 초기화할까요?`
    );

    if (!ok) return;

    await updateMember(id, {
      warningCount: 0
    });

    return;
  }

  if (button.classList.contains("make-admin-btn")) {
    const ok = confirm(`${nickname} 을 관리자로 임명할까요?`);

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
    } else if (role === "admin") {
      alert("관리자 계정은 삭제할 수 없습니다")
      return;
    }
    const ok = confirm(`정말 ${nickname} 을 삭제할까요?`);

    if (!ok) return;

    await deleteChecksByMemberId(id);
    await deleteMember(id);
  }
}

adminCheckSaveBtn.addEventListener("click", async () => {
  if (!selectedadminCheckMember) return;

  const dateKey = adminCheckDate.value;

  if (!dateKey) {
    alert("인증 날짜를 선택해주세요.");
    return;
  }

  try {
    await addAdminCheck(
      selectedadminCheckMember,
      dateKey
    );

    selectedadminCheckMember = null;
    adminCheckModal.classList.remove("open");

    alert("인증을 추가했습니다.");

    await getMembers();
  } catch (error) {
    alert(error.message || "인증 추가 중 오류가 발생했습니다.");
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

excelDownloadBtn.addEventListener("click", () => {
  const rows = [
    ["닉네임", "운동횟수"]
  ];

  memberData.forEach(member => {
    rows.push([
      member.nickname,
      `${member.weeklyCount || 0}회`
    ]);
  });

  const csvContent = rows
    .map(row => row.join(","))
    .join("\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;

  const selectedMonth = monthInput.value;

  const selectedWeek = [...weekSelect.options].find(option =>
    option.value === selectedWeekKey
  );

  const weekText = selectedWeek
    ? selectedWeek.textContent.trim()
    : selectedWeekKey;

  a.download = `${selectedMonth}_${weekText}_운동기록.csv`;

  a.click();

  URL.revokeObjectURL(url);
});

document.addEventListener("click", (e) => {
  const moreBtn = e.target.closest(".more-btn");

  if (moreBtn) {
    const menu = moreBtn.nextElementSibling;

    document
      .querySelectorAll(".more-menu")
      .forEach(item => {
        if (item !== menu) {
          item.classList.remove("open");
        }
      });

    menu.classList.toggle("open");
    return;
  }

  if (!e.target.closest(".more-menu")) {
    document
      .querySelectorAll(".more-menu")
      .forEach(menu => {
        menu.classList.remove("open");
      });
  }

  const toggleBtn = e.target.closest(".admin-section__toggle");
  if (!toggleBtn) return;

  const panel = toggleBtn.closest(".admin-section");
  panel.classList.toggle("is-open");
});