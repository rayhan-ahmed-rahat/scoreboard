import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS, DEFAULT_CATEGORIES } from "../firebase/collections";
import { db } from "../firebase/config";

function mapSnapshot(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

function subscribeToOrderedCollection(collectionName, orderField, callback, onError) {
  const collectionQuery = query(
    collection(db, collectionName),
    orderBy(orderField, "asc")
  );

  return onSnapshot(collectionQuery, (snapshot) => callback(mapSnapshot(snapshot)), onError);
}

export function subscribeToStudents(callback, onError) {
  const studentsQuery = query(
    collection(db, COLLECTIONS.STUDENTS),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(studentsQuery, (snapshot) => callback(mapSnapshot(snapshot)), onError);
}

export function subscribeToStudentById(studentId, callback, onError) {
  return onSnapshot(
    doc(db, COLLECTIONS.STUDENTS, studentId),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback({ id: snapshot.id, ...snapshot.data() });
    },
    onError
  );
}

export async function addStudent(payload) {
  const studentRef = doc(collection(db, COLLECTIONS.STUDENTS));
  const batchSnapshot = payload.batch
    ? await getDoc(doc(db, COLLECTIONS.BATCHES, payload.batch))
    : null;
  const batchData = batchSnapshot?.exists() ? batchSnapshot.data() : null;
  const batchWriter = writeBatch(db);

  batchWriter.set(studentRef, {
    ...payload,
    totalScore: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batchWriter.set(doc(db, COLLECTIONS.PUBLIC_LEADERBOARD, studentRef.id), {
    studentRef: studentRef.id,
    studentId: payload.studentId,
    name: payload.name,
    batch: payload.batch,
    batchName: batchData?.name || "",
    totalScore: 0,
    status: payload.status,
    updatedAt: serverTimestamp(),
  });

  await batchWriter.commit();
}

export async function addStudentsFromImport(studentRows) {
  const batchWriter = writeBatch(db);
  const batchDocs = await getDocs(collection(db, COLLECTIONS.BATCHES));
  const batchMap = new Map(
    batchDocs.docs.map((document) => [document.id, document.data().name || ""])
  );

  studentRows.forEach((row) => {
    const studentRef = doc(collection(db, COLLECTIONS.STUDENTS));
    batchWriter.set(studentRef, {
      ...row,
      totalScore: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batchWriter.set(doc(db, COLLECTIONS.PUBLIC_LEADERBOARD, studentRef.id), {
      studentRef: studentRef.id,
      studentId: row.studentId,
      name: row.name,
      batch: row.batch,
      batchName: batchMap.get(row.batch) || "",
      totalScore: 0,
      status: row.status,
      updatedAt: serverTimestamp(),
    });
  });

  await batchWriter.commit();
}

export async function updateStudent(studentId, payload) {
  const batchSnapshot = payload.batch
    ? await getDoc(doc(db, COLLECTIONS.BATCHES, payload.batch))
    : null;
  const batchData = batchSnapshot?.exists() ? batchSnapshot.data() : null;
  const batchWriter = writeBatch(db);

  batchWriter.update(doc(db, COLLECTIONS.STUDENTS, studentId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
  batchWriter.set(
    doc(db, COLLECTIONS.PUBLIC_LEADERBOARD, studentId),
    {
      studentId: payload.studentId,
      name: payload.name,
      batch: payload.batch,
      batchName: batchData?.name || "",
      status: payload.status,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batchWriter.commit();
}

export async function deleteStudent(studentId) {
  const batchWriter = writeBatch(db);
  batchWriter.delete(doc(db, COLLECTIONS.STUDENTS, studentId));
  batchWriter.delete(doc(db, COLLECTIONS.PUBLIC_LEADERBOARD, studentId));
  await batchWriter.commit();
}

export function subscribeToCategories(callback, onError) {
  return subscribeToOrderedCollection(COLLECTIONS.CATEGORIES, "name", callback, onError);
}

export async function addCategory(payload) {
  await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCategory(categoryId, payload) {
  await updateDoc(doc(db, COLLECTIONS.CATEGORIES, categoryId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(categoryId) {
  await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, categoryId));
}

export function subscribeToBatches(callback, onError) {
  return subscribeToOrderedCollection(COLLECTIONS.BATCHES, "name", callback, onError);
}

export async function addBatch(payload) {
  await addDoc(collection(db, COLLECTIONS.BATCHES), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBatch(batchId, payload) {
  const batchWriter = writeBatch(db);
  batchWriter.update(doc(db, COLLECTIONS.BATCHES, batchId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });

  const relatedStudents = await getDocs(
    query(collection(db, COLLECTIONS.STUDENTS), where("batch", "==", batchId))
  );

  relatedStudents.forEach((studentDocument) => {
    batchWriter.set(
      doc(db, COLLECTIONS.PUBLIC_LEADERBOARD, studentDocument.id),
      {
        batch: batchId,
        batchName: payload.name,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batchWriter.commit();
}

export async function deleteBatch(batchId) {
  const studentQuery = query(
    collection(db, COLLECTIONS.STUDENTS),
    where("batch", "==", batchId)
  );
  const studentsSnapshot = await getDocs(studentQuery);

  if (!studentsSnapshot.empty) {
    throw new Error("Move students out of this batch before deleting it.");
  }

  await deleteDoc(doc(db, COLLECTIONS.BATCHES, batchId));
}

export async function ensureDefaultCategories() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CATEGORIES));

  if (!snapshot.empty) {
    return;
  }

  const batchWriter = writeBatch(db);

  DEFAULT_CATEGORIES.forEach((name) => {
    const categoryRef = doc(collection(db, COLLECTIONS.CATEGORIES));
    batchWriter.set(categoryRef, {
      name,
      description: `${name} points`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  batchWriter.set(
    doc(db, COLLECTIONS.SETTINGS, "app"),
    {
      defaultCategoriesSeeded: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batchWriter.commit();
}

export async function rebuildPublicLeaderboard() {
  const [studentSnapshot, batchSnapshot] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.STUDENTS)),
    getDocs(collection(db, COLLECTIONS.BATCHES)),
  ]);
  const batchMap = new Map(
    batchSnapshot.docs.map((document) => [document.id, document.data().name || ""])
  );
  const batchWriter = writeBatch(db);

  studentSnapshot.forEach((studentDocument) => {
    const student = studentDocument.data();

    batchWriter.set(doc(db, COLLECTIONS.PUBLIC_LEADERBOARD, studentDocument.id), {
      studentRef: studentDocument.id,
      studentId: student.studentId || "",
      name: student.name || "",
      batch: student.batch || "",
      batchName: batchMap.get(student.batch) || "",
      totalScore: student.totalScore || 0,
      status: student.status || "active",
      updatedAt: serverTimestamp(),
    });
  });

  await batchWriter.commit();
}
