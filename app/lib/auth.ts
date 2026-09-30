import { NextAuthOptions } from "next-auth";

import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

import { adminAuth, adminDb } from "@/app/lib/firebase-admin";

import { v4 as uuidv4 } from "uuid";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",

      credentials: {
        token: { type: "text" },
      },

      async authorize(credentials) {
        if (!credentials?.token) return null;

        try {
          // Verifica o ID Token do Firebase
          const decoded = await adminAuth.verifyIdToken(credentials.token);

          // Busca o usuário no Firebase Authentication
          const userRecord = await adminAuth.getUser(decoded.uid);

          // Busca também o usuário no Firestore
          const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();

          const firestoreUser = userSnap.exists ? userSnap.data() : null;

          return {
            id: decoded.uid,

            // Primeiro tenta o Firestore
            // Depois Firebase Authentication
            // Por último o e-mail
            name:
              firestoreUser?.name ??
              userRecord.displayName ??
              userRecord.email ??
              "",

            email: userRecord.email ?? "",

            // Primeiro tenta o Firestore
            // Depois Firebase Authentication
            image: firestoreUser?.photo ?? userRecord.photoURL ?? "",
          };
        } catch (error) {
          console.error("Erro ao autorizar usuário:", error);

          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Login com e-mail/senha
      if (account?.provider === "credentials") {
        return true;
      }

      // Login com Google
      const userRef = adminDb.doc(`users/${user.id!}`);

      const userSnap = await userRef.get();

      if (userSnap.exists) {
        return true;
      }

      const invitesSnap = await adminDb
        .collection("invites")
        .where("email", "==", user.email)
        .get();

      if (!invitesSnap.empty) {
        await userRef.set({
          name: user.name,
          email: user.email,
          photo: user.image,
          createdAt: new Date(),
        });

        return true;
      }

      const workspaceId = uuidv4();

      await userRef.set({
        name: user.name,
        email: user.email,
        photo: user.image,
        workspaceId,
        createdAt: new Date(),
      });

      await adminDb.doc(`workspaces/${workspaceId}`).set({
        name: `Workspace de ${user.name?.split(" ")[0]}`,
        ownerId: user.id,
        createdAt: new Date(),
      });

      await adminDb
        .doc(`workspaceMembers/${workspaceId}/members/${user.id}`)
        .set({
          role: "admin",
          userId: user.id,
          joinedAt: new Date(),
        });

      return true;
    },

    async jwt({ token, user }) {
      // Quando o usuário faz login, guarda os dados no JWT
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        // Garante que nome e foto cheguem ao frontend
        session.user.name = token.name ?? session.user.name ?? "";

        session.user.email = token.email ?? session.user.email ?? "";

        session.user.image = token.picture ?? session.user.image ?? "";

        try {
          const firebaseToken = await adminAuth.createCustomToken(token.sub);

          (session as any).firebaseToken = firebaseToken;
        } catch (error) {
          console.error("Erro ao criar custom token:", error);
        }
      }

      return session;
    },
  },
};
