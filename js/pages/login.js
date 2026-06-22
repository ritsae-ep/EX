import { googleLogin, emailLogin } from "../services/authService.js";

const emailLoginForm = document.querySelector("#emailLoginForm");
const googleLoginBtn = document.querySelector("#googleLoginBtn");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");

// 이메일 로그인
emailLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  await emailLogin(email, password);
});

// 구글 로그인
googleLoginBtn.addEventListener("click", async () => {
  await googleLogin();
});