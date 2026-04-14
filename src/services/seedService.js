import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { COLLECTIONS, DEFAULT_CATEGORIES } from "../firebase/collections";
import { db } from "../firebase/config";
import { buildTeacherProfile } from "../utils/formatters";

const demoBatches = [
  { name: "Batch A", code: "BATCH-A", description: "Morning coding group", status: "active" },
  { name: "Batch B", code: "BATCH-B", description: "Afternoon coding group", status: "active" },
];

const demoStudents = [
  {
    name: "Ariana Khan",
    studentId: "TA-1001",
    age: 15,
    school: "Dhaka Central School",
    batchCode: "BATCH-A",
    status: "active",
    notes: "Strong project participation",
    totalScore: 0,
  },
  {
    name: "Nabil Rahman",
    studentId: "TA-1002",
    age: 16,
    school: "Tech Scholars High",
    batchCode: "BATCH-A",
    status: "active",
    notes: "Consistent attendance",
    totalScore: 0,
  },
  {
    name: "Sadia Islam",
    studentId: "TA-1003",
    age: 14,
    school: "Future Learners School",
    batchCode: "BATCH-B",
    status: "active",
    notes: "Often helps teammates",
    totalScore: 0,
  },
  {
    name: "Mehedi Hasan",
    studentId: "TA-1004",
    age: 17,
    school: "City Model School",
    batchCode: "BATCH-B",
    status: "inactive",
    notes: "On a short academic break",
    totalScore: 0,
  },
];

const demoLogBlueprint = [
  { studentId: "TA-1001", categoryName: "Attendance", points: 10, type: "add", reason: "Perfect attendance this week" },
  { studentId: "TA-1001", categoryName: "Project work", points: 15, type: "add", reason: "Excellent app prototype" },
  { studentId: "TA-1002", categoryName: "Homework", points: 8, type: "add", reason: "Submitted all assignments on time" },
  { studentId: "TA-1002", categoryName: "Behavior", points: 2, type: "deduct", reason: "Classroom distraction warning" },
  { studentId: "TA-1003", categoryName: "Bonus", points: 12, type: "add", reason: "Volunteered during coding event" },
  { studentId: "TA-1004", categoryName: "Class performance", points: 5, type: "add", reason: "Strong quiz performance" },
];

export async function seedDemoData(teacher) {
  const teacherProfile = buildTeacherProfile(teacher);
  const categorySnapshot = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
  const batchSnapshot = await getDocs(collection(db, COLLECTIONS.BATCHES));
  const batch = writeBatch(db);
  const categoryMap = new Map();
  const batchMap = new Map();

  if (categorySnapshot.empty) {
    DEFAULT_CATEGORIES.forEach((name) => {
      const categoryRef = doc(collection(db, COLLECTIONS.CATEGORIES));
      categoryMap.set(name, categoryRef.id);
      batch.set(categoryRef, {
        name,
        description: `${name} points`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } else {
    categorySnapshot.forEach((categoryDocument) => {
      categoryMap.set(categoryDocument.data().name, categoryDocument.id);
    });
  }

  if (batchSnapshot.empty) {
    demoBatches.forEach((batchItem) => {
      const batchRef = doc(collection(db, COLLECTIONS.BATCHES));
      batchMap.set(batchItem.code, batchRef.id);
      batch.set(batchRef, {
        ...batchItem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } else {
    batchSnapshot.forEach((batchDocument) => {
      batchMap.set(batchDocument.data().code, batchDocument.id);
    });
  }

  const studentDocMap = new Map();

  for (const student of demoStudents) {
    const { batchCode, ...studentData } = student;
    const existingStudentQuery = query(
      collection(db, COLLECTIONS.STUDENTS),
      where("studentId", "==", student.studentId)
    );
    const existingStudentSnapshot = await getDocs(existingStudentQuery);
    const studentRef = existingStudentSnapshot.empty
      ? doc(collection(db, COLLECTIONS.STUDENTS))
      : existingStudentSnapshot.docs[0].ref;

    studentDocMap.set(student.studentId, studentRef.id);

    batch.set(
      studentRef,
      {
        ...studentData,
        batch: batchMap.get(batchCode),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  const totals = new Map();

  demoLogBlueprint.forEach((log) => {
    const signedPoints = log.type === "deduct" ? -Math.abs(log.points) : Math.abs(log.points);
    const studentRefId = studentDocMap.get(log.studentId);
    const student = demoStudents.find((entry) => entry.studentId === log.studentId);
    const logRef = doc(collection(db, COLLECTIONS.SCORE_LOGS));

    totals.set(log.studentId, (totals.get(log.studentId) || 0) + signedPoints);

    batch.set(logRef, {
      studentRef: studentRefId,
      studentId: log.studentId,
      studentName: student.name,
      categoryId: categoryMap.get(log.categoryName),
      categoryName: log.categoryName,
      points: Math.abs(log.points),
      type: log.type,
      reason: log.reason,
      teacherName: teacherProfile.name,
      teacherEmail: teacherProfile.email,
      createdAt: serverTimestamp(),
    });
  });

  demoStudents.forEach((student) => {
    const studentId = studentDocMap.get(student.studentId);

    if (!studentId) {
      return;
    }

    batch.set(
      doc(db, COLLECTIONS.STUDENTS, studentId),
      {
        totalScore: totals.get(student.studentId) || 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
}
