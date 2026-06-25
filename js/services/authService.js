import { auth, db } from "../core/firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// 구글 로그인
export async function googleLogin(){
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const q = query(
            collection(db, "members"),
            where("uid", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            location.href = "./index.html";
            return;
        }

        location.href = "./index.html";

    } catch (error) {
        console.error(error);
        alert("구글 로그인에 실패했습니다.");
    }
}

// 이메일 로그인
export async function emailLogin(email, password){
    try {
        await signInWithEmailAndPassword(auth, email, password);
        location.href = "./index.html";
    } catch (error) {
        console.error(error);
        alert("이메일 로그인에 실패했습니다.");
    }
}

// 로그아웃
export function logout(){}