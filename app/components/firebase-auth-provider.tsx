"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/app/lib/firebase";

export function FirebaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  useEffect(() => {
    const token = (session as any)?.firebaseToken;
    if (token) {
      signInWithCustomToken(auth, token).catch((err) =>
        console.error("Firebase auth error:", err.code, err.message),
      );
    }
  }, [session]);

  return <>{children}</>;
}
