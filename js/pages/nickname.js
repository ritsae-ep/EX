import { auth, db } from "../core/firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const form = document.querySelector("#nicknameForm");
const nicknameInput = document.querySelector("#nickname");

let currentUser = null;

// 현재 로그인 사용자 확인
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "./login.html";
    return;
  }
  currentUser = user;
});

// 닉네임 등록
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    alert("로그인 정보를 확인할 수 없습니다.");
    location.href = "./login.html";
    return;
  }

  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    alert("닉네임 입력");
    return;
  }

  await setDoc(doc(db, "members", currentUser.uid), {
    uid: currentUser.uid,
    email: currentUser.email,
    nickname,
    role: "user",
    approved: false,
    status: "normal",
    statusStartDate: null,
    statusEndDate: null,
    canChangeStatus: true,
    createdAt: serverTimestamp()
  });

  alert("가입 완료! 승인 후 이용 가능합니다.");
  location.href = "./index.html";
});