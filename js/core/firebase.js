// Import the functions you need from the SDKs you need
// Firebase SDK v12.15.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQqA91DNGxVJtrSer7V1m-pRLEc8A_L68",
  authDomain: "ex-exercise-club.firebaseapp.com",
  projectId: "ex-exercise-club",
  storageBucket: "ex-exercise-club.firebasestorage.app",
  messagingSenderId: "104530506763",
  appId: "1:104530506763:web:f50b52eedeb7483fe4430e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);