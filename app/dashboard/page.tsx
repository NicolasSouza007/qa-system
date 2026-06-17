import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/app/components/admin-dashboard";
import { MemberDashboard } from "@/app/components/member-dashboard";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/");
  }

  // busca o role do usuário no Firestore
  const userDoc = await adminDb.doc(`users/${session.user.id}`).get();
  const role = userDoc.data()?.role ?? "member";

  return (
    <div className="bg-gray-800  px-6 py-8 w-10/12 mx-auto">
      <div className="mb-8">
        <h2 className="text-white text-2xl font-bold">
          Olá,{" "}
          <span className="text-sky-300">
            {session.user.name?.split(" ")[0]}
          </span>{" "}
          👋
        </h2>
        <p className="text-gray-200 text-sm mt-1">
          {role === "admin" ? "Visão geral do time" : "Suas tasks de hoje"}
        </p>
      </div>

      {role === "admin" ? (
        <AdminDashboard />
      ) : (
        <MemberDashboard userId={session.user.id!} />
      )}
    </div>
  );
}
