import {
  createContext,
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
import { auth } from "../firebase/config";
import { ROLES } from "../firebase/collections";
import { subscribeToUserProfile, syncUserProfile } from "../services/userService";
import { buildTeacherProfile } from "../utils/formatters";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  const value = useMemo(
    () => ({
      user,
      profile,
      error,
      loading,
      isAdmin: profile?.role === ROLES.ADMIN,
      isTeacher: profile?.role === ROLES.TEACHER,
      login: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),
      logout: () => signOut(auth),
    }),
    [user, profile, error, loading]
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
