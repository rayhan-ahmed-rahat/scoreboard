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
} from "firebase/firestore";
import { COLLECTIONS } from "../firebase/collections";
import { db } from "../firebase/config";

function mapSnapshot(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export function subscribeToClusters(callback, onError) {
  const clustersQuery = query(
    collection(db, COLLECTIONS.CLUSTERS),
    orderBy("name", "asc")
  );

  return onSnapshot(
    clustersQuery,
    (snapshot) => callback(mapSnapshot(snapshot)),
    onError
  );
}

export function subscribeToClustersByBatch(batchId, callback, onError) {
  const clustersQuery = query(
    collection(db, COLLECTIONS.CLUSTERS),
    where("batchId", "==", batchId),
    orderBy("name", "asc")
  );

  return onSnapshot(
    clustersQuery,
    (snapshot) => callback(mapSnapshot(snapshot)),
    onError
  );
}

export async function getClusterById(clusterId) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.CLUSTERS, clusterId));

  if (!snapshot.exists()) {
    return null;
  }

  return { id: snapshot.id, ...snapshot.data() };
}

export function subscribeToCluster(clusterId, callback, onError) {
  return onSnapshot(
    doc(db, COLLECTIONS.CLUSTERS, clusterId),
    (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export async function updateTeacherNameInClusters(teacherUid, newName) {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.CLUSTERS),
      where("assignedTeacherUid", "==", teacherUid)
    )
  );

  if (snapshot.empty) return;

  await Promise.all(
    snapshot.docs.map((document) =>
      updateDoc(document.ref, {
        assignedTeacherName: newName,
        updatedAt: serverTimestamp(),
      })
    )
  );
}

export async function addCluster(payload) {
  await addDoc(collection(db, COLLECTIONS.CLUSTERS), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCluster(clusterId, payload) {
  const updatePayload = { ...payload, updatedAt: serverTimestamp() };

  if (payload.batchId) {
    const batchSnapshot = await getDoc(
      doc(db, COLLECTIONS.BATCHES, payload.batchId)
    );
    if (batchSnapshot.exists()) {
      updatePayload.batchName = batchSnapshot.data().name || "";
    }
  }

  await updateDoc(doc(db, COLLECTIONS.CLUSTERS, clusterId), updatePayload);
}

export async function deleteCluster(clusterId) {
  const studentsInCluster = await getDocs(
    query(
      collection(db, COLLECTIONS.STUDENTS),
      where("clusterId", "==", clusterId)
    )
  );

  if (!studentsInCluster.empty) {
    throw new Error(
      "Move students out of this cluster before deleting it."
    );
  }

  await deleteDoc(doc(db, COLLECTIONS.CLUSTERS, clusterId));
}
