import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { adminDb, adminAuth } from "@/app/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";

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

      console.log("userSnap.exists:", userSnap.exists);
      console.log("userSnap.data():", userSnap.data());

      // usuário já existe, deixa entrar
      if (userSnap.exists) return true;

      // verifica se tem convite pendente
      const invitesSnap = await adminDb
        .collection("invites")
        .where("email", "==", user.email)
        .get();

      if (!invitesSnap.empty) {
        // tem convite — cria o usuário sem workspace próprio
        await userRef.set({
          name: user.name,
          email: user.email,
          photo: user.image,
          createdAt: new Date(),
        });
        return true;
      }

      // novo usuário sem convite — cria conta e workspace próprio
      const workspaceId = uuidv4();

      await userRef.set({
        name: user.name,
        email: user.email,
        photo: user.image,
        workspaceId, // workspace padrão do usuário
        createdAt: new Date(),
      });

      // cria o workspace
      await adminDb.doc(`workspaces/${workspaceId}`).set({
        name: `Workspace de ${user.name?.split(" ")[0]}`,
        ownerId: user.id,
        createdAt: new Date(),
      });

      // adiciona como admin do workspace
      await adminDb
        .doc(`workspaceMembers/${workspaceId}/members/${user.id}`)
        .set({
          role: "admin",
          joinedAt: new Date(),
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
