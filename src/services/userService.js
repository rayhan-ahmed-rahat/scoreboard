import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { COLLECTIONS, ROLES } from "../firebase/collections";
import { db } from "../firebase/config";

function mapSnapshot(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function syncUserProfile(firebaseUser, displayName) {
  const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  await setDoc(
    userRef,
    {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName,
      ...(snapshot.exists() ? {} : { role: ROLES.TEACHER }),
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToUserProfile(userId, callback, onError) {
  return onSnapshot(
    doc(db, COLLECTIONS.USERS, userId),
    (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export function subscribeToUsers(callback, onError) {
  const usersQuery = query(collection(db, COLLECTIONS.USERS), orderBy("email", "asc"));

  return onSnapshot(usersQuery, (snapshot) => callback(mapSnapshot(snapshot)), onError);
}

export async function updateUserRole(userId, role) {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    role,
    updatedAt: serverTimestamp(),
  });
}
