import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { COLLECTIONS } from "../firebase/collections";
import { db } from "../firebase/config";
import { buildTeacherProfile } from "../utils/formatters";

function mapLogSnapshot(snapshot) {
  return snapshot.docs.map((document) => {
    const data = document.data();
    const signedPoints = data.type === "deduct" ? -Math.abs(data.points) : Math.abs(data.points);

    return {
      id: document.id,
      ...data,
      signedPoints,
    };
  });
}

export async function createScoreAdjustment({
  student,
  category,
  points,
  type,
  reason,
  teacher,
}) {
  if (!student?.id) {
    throw new Error("Please choose a student first.");
  }

  if (!category?.id) {
    throw new Error("Please choose a category first.");
  }

  if (!reason?.trim()) {
    throw new Error("A reason is required for every score adjustment.");
  }

  if (!points || Number(points) <= 0) {
    throw new Error("Points must be greater than zero.");
  }

  const studentRef = doc(db, COLLECTIONS.STUDENTS, student.id);
  const teacherProfile = buildTeacherProfile(teacher);

  await runTransaction(db, async (transaction) => {
    const studentSnapshot = await transaction.get(studentRef);
    const publicLeaderboardRef = doc(db, COLLECTIONS.PUBLIC_LEADERBOARD, student.id);

    if (!studentSnapshot.exists()) {
      throw new Error("Student not found.");
    }

    const currentStudent = studentSnapshot.data();
    const signedPoints = type === "deduct" ? -Math.abs(points) : Math.abs(points);
    const nextTotalScore = (currentStudent.totalScore || 0) + signedPoints;

    if (nextTotalScore < 0) {
      throw new Error("This deduction would make the total score negative.");
    }

    transaction.update(studentRef, {
      totalScore: nextTotalScore,
      updatedAt: serverTimestamp(),
    });
    transaction.set(
      publicLeaderboardRef,
      {
        studentRef: student.id,
        studentId: currentStudent.studentId,
        name: currentStudent.name,
        batch: currentStudent.batch || "",
        totalScore: nextTotalScore,
        status: currentStudent.status || "active",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const logRef = doc(collection(db, COLLECTIONS.SCORE_LOGS));
    transaction.set(logRef, {
      studentRef: student.id,
      studentId: currentStudent.studentId,
      studentName: currentStudent.name,
      categoryId: category.id,
      categoryName: category.name,
      points: Math.abs(points),
      type,
      reason: reason.trim(),
      teacherName: teacherProfile.name,
      teacherEmail: teacherProfile.email,
      createdAt: serverTimestamp(),
    });
  });
}

export async function createBulkScoreAdjustments({
  student,
  adjustments,
  reason,
  teacher,
}) {
  if (!student?.id) {
    throw new Error("Please choose a student first.");
  }

  const validAdjustments = adjustments.filter(
    (entry) => entry?.category?.id && Number(entry.points)
  );

  if (!validAdjustments.length) {
    throw new Error("Enter at least one point value before saving.");
  }

  const studentRef = doc(db, COLLECTIONS.STUDENTS, student.id);
  const teacherProfile = buildTeacherProfile(teacher);

  await runTransaction(db, async (transaction) => {
    const studentSnapshot = await transaction.get(studentRef);

    if (!studentSnapshot.exists()) {
      throw new Error("Student not found.");
    }

    const currentStudent = studentSnapshot.data();
    const totalDelta = validAdjustments.reduce((sum, entry) => {
      const numericPoints = Number(entry.points);
      return sum + numericPoints;
    }, 0);
    const nextTotalScore = (currentStudent.totalScore || 0) + totalDelta;

    if (nextTotalScore < 0) {
      throw new Error("This score entry would make the total score negative.");
    }

    transaction.update(studentRef, {
      totalScore: nextTotalScore,
      updatedAt: serverTimestamp(),
    });

    validAdjustments.forEach((entry) => {
      const numericPoints = Number(entry.points);
      const logRef = doc(collection(db, COLLECTIONS.SCORE_LOGS));

      transaction.set(logRef, {
        studentRef: student.id,
        studentId: currentStudent.studentId,
        studentName: currentStudent.name,
        categoryId: entry.category.id,
        categoryName: entry.category.name,
        points: Math.abs(numericPoints),
        type: numericPoints < 0 ? "deduct" : "add",
        reason: reason?.trim() || "",
        teacherName: teacherProfile.name,
        teacherEmail: teacherProfile.email,
        createdAt: serverTimestamp(),
      });
    });
  });
}

export function subscribeToScoreLogs(callback, options = {}, onError) {
  const constraints = [orderBy("createdAt", "desc")];

  if (options.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  const logsQuery = query(collection(db, COLLECTIONS.SCORE_LOGS), ...constraints);

  return onSnapshot(logsQuery, (snapshot) => callback(mapLogSnapshot(snapshot)), onError);
}

export function subscribeToAllScoreLogs(callback, onError) {
  return subscribeToScoreLogs(callback, {}, onError);
}

export function subscribeToPublicLeaderboard(callback, onError) {
  const leaderboardQuery = query(
    collection(db, COLLECTIONS.PUBLIC_LEADERBOARD),
    orderBy("studentId", "asc")
  );

  return onSnapshot(
    leaderboardQuery,
    (snapshot) =>
      callback(
        snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }))
      ),
    onError
  );
}

export function subscribeToStudentScoreLogs(studentRefId, callback, onError) {
  const logsQuery = query(
    collection(db, COLLECTIONS.SCORE_LOGS),
    where("studentRef", "==", studentRefId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(logsQuery, (snapshot) => callback(mapLogSnapshot(snapshot)), onError);
}
