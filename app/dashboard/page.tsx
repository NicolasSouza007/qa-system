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

  const userDoc = await adminDb.doc(`users/${session.user.id}`).get();
  const userData = userDoc.data();

  console.log("userData:", userData);
  console.log("userId:", session.user.id);

  if (!userData) redirect("/");

  let workspaceId = userData.workspaceId as string | undefined;
  let role = "admin";

  console.log("workspaceId do userData:", workspaceId);

  if (workspaceId) {
    const memberDoc = await adminDb
      .doc(`workspaceMembers/${workspaceId}/members/${session.user.id}`)
      .get();
    role = memberDoc.data()?.role ?? "admin";
    console.log("role encontrado:", role);
  } else {
    const memberSnap = await adminDb
      .collectionGroup("members")
      .where("userId", "==", session.user.id)
      .get();

    console.log("memberSnap size:", memberSnap.size);

    if (!memberSnap.empty) {
      const memberDoc = memberSnap.docs[0];
      role = memberDoc.data().role;
      workspaceId = memberDoc.ref.parent.parent?.id;
      console.log("workspaceId encontrado via collectionGroup:", workspaceId);
    }
  }

  console.log("workspaceId final:", workspaceId);

  if (!workspaceId) {
    console.log("sem workspaceId, redirecionando para /");
    redirect("/");
  }
  // ...resto do código

  return (
    <div className="bg-gray-800 px-6 py-8 w-10/12 h-220 mx-auto ">
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
        <AdminDashboard workspaceId={workspaceId} userId={session.user.id!} />
      ) : (
        <MemberDashboard userId={session.user.id!} workspaceId={workspaceId} />
      )}
    </div>
  );
}
