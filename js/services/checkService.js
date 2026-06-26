import { db } from "../core/firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  deleteField,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import {
  getTodayKey,
  getDateAfterDays,
  getWeekKeyByDate
} from "../utils/date.js";

export async function getWeeklyChecks(weekKey) {
  const q = query(
    collection(db, "checks"),
    where("weekKey", "==", weekKey)
  );

  const snapshot = await getDocs(q);

  const checks = [];

  snapshot.forEach((item) => {
    checks.push({
      id: item.id,
      ...item.data()
    });
  });

  return checks;
}

export async function getTodayCheck(memberId, todayKey) {
  const q = query(
    collection(db, "checks"),
    where("memberId", "==", memberId),
    where("dateKey", "==", todayKey)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const checkDoc = snapshot.docs[0];

  return {
    id: checkDoc.id,
    ...checkDoc.data()
  };
}

export async function addCheck(member, todayKey, weekKey, photoBase64) {
  await addDoc(collection(db,"checks"), {
    memberId: member.id,
    uid: member.uid,
    nickname: member.nickname,

    dateKey: todayKey,
    weekKey,

    photoBase64,
    photoExpiresAt: getDateAfterDays(14),

    createdAt: serverTimestamp()
  });
}

export async function deleteCheck(checkId) {
  await deleteDoc(doc(db, "checks", checkId));
}

export async function deleteChecksByMemberId(memberId) {
  const q = query(
    collection(db, "checks"),
    where("memberId", "==", memberId)
  );

  const snapshot = await getDocs(q);

  for (const checkDoc of snapshot.docs) {
    await deleteDoc(doc(db, "checks", checkDoc.id));
  }
}

export function listenWeeklyChecks(weekKey, callback) {
  const q = query(
    collection(db, "checks"),
    where("weekKey", "==", weekKey)
  );

  return onSnapshot(q, callback);
}

export async function cleanupExpiredPhotos() {
  const checks = await getDocs(collection(db, "checks"));
  const todayKey = getTodayKey();

  for (const checkDoc of checks.docs) {
    const check = checkDoc.data();

    if (!check.photoExpiresAt) continue;

    if (check.photoExpiresAt < todayKey) {
      await updateDoc(
        doc(db, "checks", checkDoc.id),
        {
          photoBase64: deleteField(),
          photoExpiresAt: deleteField()
        }
      );
    }
  }
}

export async function addAdminCheck(member, dateKey) {
  const q = query(
    collection(db, "checks"),
    where("memberId", "==", member.id),
    where("dateKey", "==", dateKey)
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    throw new Error("이미 해당 날짜에 인증이 있습니다.");
  }

  await addDoc(collection(db, "checks"), {
    memberId: member.id,
    uid: member.uid || member.id,
    nickname: member.nickname,
    dateKey,
    weekKey: getWeekKeyByDate(new Date(dateKey)),
    imageUrl: null,
    createdBy: "admin",
    createdAt: serverTimestamp()
  });
}