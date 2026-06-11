import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { adminDb, adminAuth } from "@/app/lib/firebase-admin";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const userRef = adminDb.doc(`users/${user.id!}`);
      const userSnap = await userRef.get();

      // usuário já existe, deixa entrar
      if (userSnap.exists) return true;

      // verifica se tem qualquer convite para esse e-mail (aceito ou não)
      const invitesSnap = await adminDb
        .collection("invites")
        .where("email", "==", user.email)
        .get();

      if (invitesSnap.empty) return false; // nunca foi convidado, bloqueia

      // cria o usuário como member
      await userRef.set({
        name: user.name,
        email: user.email,
        photo: user.image,
        role: "member",
        createdAt: new Date(),
      });

      return true;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        const firebaseToken = await adminAuth.createCustomToken(token.sub!);
        (session as any).firebaseToken = firebaseToken;
      }
      return session;
    },
  },
};
