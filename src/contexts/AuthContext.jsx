import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { COLLECTIONS, ROLES } from "../firebase/collections";
import { subscribeToUserProfile, syncUserProfile } from "../services/userService";
import { buildTeacherProfile } from "../utils/formatters";

const AuthContext = createContext(null);

function loadStudentSession() {
  try {
    const saved = localStorage.getItem("studentSession");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(loadStudentSession);

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const teacherProfile = buildTeacherProfile(firebaseUser);

        try {
          setError("");
          await syncUserProfile(firebaseUser, teacherProfile.name);
          unsubscribeProfile = subscribeToUserProfile(
            firebaseUser.uid,
            (nextProfile) => {
              setProfile(nextProfile);
              setLoading(false);
            },
            (nextError) => {
              setError(nextError.message || "Failed to load user profile.");
              setProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: teacherProfile.name,
                role: ROLES.TEACHER,
              });
              setLoading(false);
            }
          );
        } catch (nextError) {
          setError(nextError.message || "Failed to sync user profile.");
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: teacherProfile.name,
            role: ROLES.TEACHER,
          });
          setLoading(false);
        }
      } else {
        unsubscribeProfile();
        setProfile(null);
        setError("");
        setLoading(false);
      }

      setUser(firebaseUser);
    });

    return () => {
      unsubscribeProfile();
      unsubscribe();
    };
  }, []);

  const loginAsStudent = useCallback(async (batchId, studentId) => {
    const leaderboardQuery = query(
      collection(db, COLLECTIONS.PUBLIC_LEADERBOARD),
      where("batch", "==", batchId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(leaderboardQuery);

    if (snapshot.empty) {
      throw new Error("No student found with that ID in the selected batch.");
    }

    const studentDoc = snapshot.docs[0];
    const data = studentDoc.data();
    const session = {
      id: studentDoc.id,
      studentId: data.studentId,
      name: data.name,
      batch: batchId,
      batchName: data.batchName || "",
    };

    localStorage.setItem("studentSession", JSON.stringify(session));
    setStudentSession(session);
    return session;
  }, []);

  const logoutStudent = useCallback(() => {
    localStorage.removeItem("studentSession");
    setStudentSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      error,
      loading,
      studentSession,
      isAdmin: profile?.role === ROLES.ADMIN,
      isTeacher: profile?.role === ROLES.TEACHER || profile?.role === ROLES.ADMIN,
      isStudent: Boolean(studentSession) && !profile,
      login: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),
      logout: () => signOut(auth),
      loginAsStudent,
      logoutStudent,
    }),
    [user, profile, error, loading, studentSession, loginAsStudent, logoutStudent]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
