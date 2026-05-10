import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS } from "../firebase/collections";
import { db } from "../firebase/config";

export function subscribeToQueue(callback, onError) {
  const queueQuery = query(
    collection(db, COLLECTIONS.EVALUATION_QUEUE),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    queueQuery,
    (snapshot) =>
      callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))),
    onError
  );
}

export async function joinQueue({ studentRef, studentId, studentName, batch, batchName, reason }) {
  const existingSnapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.EVALUATION_QUEUE),
      where("studentRef", "==", studentRef),
      where("status", "in", ["waiting", "in_progress"])
    )
  );

  if (!existingSnapshot.empty) {
    throw new Error("You are already in the queue.");
  }

  await addDoc(collection(db, COLLECTIONS.EVALUATION_QUEUE), {
    studentRef,
    studentId,
    studentName,
    batch,
    batchName,
    reason: reason?.trim() || "",
    status: "waiting",
    createdAt: serverTimestamp(),
  });
}

export async function leaveQueue(entryId) {
  await deleteDoc(doc(db, COLLECTIONS.EVALUATION_QUEUE, entryId));
}

export async function callNextStudent(entryId) {
  await updateDoc(doc(db, COLLECTIONS.EVALUATION_QUEUE, entryId), {
    status: "in_progress",
    calledAt: serverTimestamp(),
  });
}

export async function resolveQueueEntry(entryId, resolution, teacherName) {
  await updateDoc(doc(db, COLLECTIONS.EVALUATION_QUEUE, entryId), {
    status: resolution,
    resolvedAt: serverTimestamp(),
    resolvedByName: teacherName || "Teacher",
  });
}
