import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";
import { redirect } from "next/navigation";
import { TicketsClient } from "@/app/components/tickets-client";

export default async function TicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const userDoc = await adminDb.doc(`users/${session.user.id}`).get();
  const userData = userDoc.data();
  if (!userData) redirect("/");

  let workspaceId = userData.workspaceId as string | undefined;
  let role = "member";

  if (workspaceId) {
    const memberDoc = await adminDb
      .doc(`workspaceMembers/${workspaceId}/members/${session.user.id}`)
      .get();
    role = memberDoc.data()?.role ?? "member";
  } else {
    const memberSnap = await adminDb
      .collectionGroup("members")
      .where("userId", "==", session.user.id)
      .get();

    if (!memberSnap.empty) {
      const memberDoc = memberSnap.docs[0];
      role = memberDoc.data().role;
      workspaceId = memberDoc.ref.parent.parent?.id;
    }
  }

  if (!workspaceId) redirect("/");

  return (
    <div className="bg-gray-800 min-h-screen px-4 sm:px-6 py-8 w-full sm:w-10/12 mx-auto">
      <div className="mb-8">
        <h2 className="text-white text-2xl font-bold">
          Tickets <span className="text-sky-300">/ Chamados</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {role === "admin"
            ? "Gerencie todos os chamados do time"
            : "Abra e acompanhe seus chamados"}
        </p>
      </div>

      <TicketsClient
        workspaceId={workspaceId}
        userId={session.user.id!}
        userName={session.user.name ?? ""}
        userPhoto={session.user.image ?? ""}
        role={role}
      />
    </div>
  );
}
