import { auth, db } from "../core/firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  collection,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const form = document.querySelector("#joinForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const nicknameInput = document.querySelector("#nickname");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const nickname = nicknameInput.value.trim();

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "members", user.uid), {
      uid: user.uid,
      email: user.email,
      nickname,
      role: "user",
      approved: false,
      status: "normal",
      statusStartDate: null,
      statusEndDate: null,
      canChangeStatus: true,
      createdAt: serverTimestamp()
    });

    alert("가입 완료! 관리자 승인 후 이용할 수 있습니다.");
    location.href = "./login.html";

  } catch (error) {
    console.error(error);
    alert("가입에 실패했습니다.");
  }
});