import { db } from "../core/firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

export async function getMemberByUid(uid) {
  const memberDoc = await getDoc(doc(db, "members", uid));

  if (!memberDoc.exists()) return null;

  return {
    id: memberDoc.id,
    ...memberDoc.data()
  };
}

export async function getAllMembers() {
  const snapshot = await getDocs(collection(db, "members"));

  const members = [];

  snapshot.forEach((item) => {
    members.push({
      id: item.id,
      ...item.data()
    });
  });

  return members;
}

export async function updateMember(memberId, data) {
  await updateDoc(doc(db, "members", memberId), data);
}

export async function deleteMember(memberId) {
  await deleteDoc(doc(db, "members", memberId));
}

export function listenMembers(callback) {
  return onSnapshot(collection(db, "members"), callback);
}