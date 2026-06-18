"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Student, Recruiter } from "@/types";

type Role = "student" | "recruiter" | null;

interface AuthCtx {
  user: { uid: string; email: string; displayName: string } | null;
  role: Role;
  studentProfile: Student | null;
  recruiterProfile: Recruiter | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (uid: string, role: Role) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthCtx["user"]>(null);
  const [role, setRole] = useState<Role>(null);
  const [studentProfile, setStudent] = useState<Student | null>(null);
  const [recruiterProfile, setRecruiter] = useState<Recruiter | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string, targetRole: Role) {
    try {
      if (targetRole === "student") {
        const sSnap = await getDoc(doc(db, "students", uid));
        if (sSnap.exists()) {
          const data = sSnap.data() as Student;
          setStudent(data);
          setRecruiter(null);
          setRole("student");
          setUser({ uid, email: data.email, displayName: data.name });
          localStorage.setItem("portal_uid", uid);
          localStorage.setItem("portal_role", "student");
          return;
        }
      } else if (targetRole === "recruiter") {
        const rSnap = await getDoc(doc(db, "recruiters", uid));
        if (rSnap.exists()) {
          const data = rSnap.data() as Recruiter;
          setRecruiter(data);
          setStudent(null);
          setRole("recruiter");
          setUser({ uid, email: data.email, displayName: data.name });
          localStorage.setItem("portal_uid", uid);
          localStorage.setItem("portal_role", "recruiter");
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load profile", error);
    }
  }

  useEffect(() => {
    const savedUid = localStorage.getItem("portal_uid");
    const savedRole = localStorage.getItem("portal_role") as Role;
    if (savedUid && savedRole) {
      loadProfile(savedUid, savedRole).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (uid: string, targetRole: Role) => {
    setLoading(true);
    await loadProfile(uid, targetRole);
    setLoading(false);
  };

  const refresh = async () => {
    const savedUid = localStorage.getItem("portal_uid");
    const savedRole = localStorage.getItem("portal_role") as Role;
    if (savedUid && savedRole) {
      await loadProfile(savedUid, savedRole);
    }
  };

  const signOut = async () => {
    localStorage.removeItem("portal_uid");
    localStorage.removeItem("portal_role");
    setUser(null);
    setRole(null);
    setStudent(null);
    setRecruiter(null);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        studentProfile,
        recruiterProfile,
        loading,
        signOut,
        signIn,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}