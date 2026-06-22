import { auth } from "../core/firebase.js";
import { getDateAfterDays } from "../utils/date.js";

import {
  getAllMembers,
  getMemberByUid,
  updateMember,
  deleteMember,
  listenMembers
} from "../services/memberService.js";

import {
  deleteChecksByMemberId
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

let memberData = [];

const statusLabel = {
  normal: "정상",
  busy: "바쁨",
  injured: "부상"
};

initModalClose();

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "./login.html";
});

showAllBtn.addEventListener("click", () => {
  renderMembers(memberData);
});


showPendingBtn.addEventListener("click", () => {
  const pendingMembers =
    memberData.filter(member =>
      !member.approved
    );

  renderMembers(pendingMembers);
});

async function getMembers() {
  const members = await getAllMembers();

  memberData = members;

  renderMembers(memberData);
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
    isListening = true;
  }
});


function renderMembers(members){
   memberList.innerHTML = members.map(member => {
    const statusText =
      member.status === "normal"
        ? "정상"
        : `${statusLabel[member.status]} ~ ${member.statusEndDate || "종료일 없음"}`;

    return `
      <li>
        <strong>${member.nickname}</strong>
        <span>${statusText}</span>
        <button class="force-status-btn" data-id="${member.id}" data-status="${member.status}">상태 변경</button>
        <span>${member.approved ? "승인됨" : "승인 대기"}</span>

        ${
          member.approved
            ? ""
            : `<button class="approve-btn" data-id="${member.id}">승인</button>`
        }

        <button class="delete-btn" data-id="${member.id}" data-nickname="${member.nickname}">삭제</button>
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

