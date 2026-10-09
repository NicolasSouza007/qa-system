import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";
import { redirect } from "next/navigation";
import { AtendimentoClient } from "@/app/components/atendimento-client";

function toISOStringSafe(value: unknown): string | null {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toISOString()
      : null;
  }

  const date =
    value instanceof Date ? value : new Date(value as string | number);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function AtendimentoPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const userDoc = await adminDb.doc(`users/${session.user.id}`).get();

  const userData = userDoc.data();

  if (!userData) {
    redirect("/");
  }

  let workspaceId = userData.workspaceId as string | undefined;

  if (workspaceId) {
    const memberDoc = await adminDb
      .doc(`workspaceMembers/${workspaceId}/members/${session.user.id}`)
      .get();

    if (!memberDoc.exists) {
      redirect("/");
    }
  } else {
    const memberSnap = await adminDb
      .collectionGroup("members")
      .where("userId", "==", session.user.id)
      .get();

    if (!memberSnap.empty) {
      workspaceId = memberSnap.docs[0].ref.parent.parent?.id;
    }
  }

  if (!workspaceId) {
    redirect("/");
  }

  const ticketsSnap = await adminDb
    .collection("tickets")
    .where("workspaceId", "==", workspaceId)
    .get();

  const tickets = ticketsSnap.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      title: String(data.title ?? ""),
      category: String(data.category ?? "Outro"),
      priority: String(data.priority ?? "medium"),
      status: String(data.status ?? "open"),
      createdAt: toISOStringSafe(data.createdAt),
      resolvedAt: toISOStringSafe(data.resolvedAt),
      clientName: String(data.clientName ?? ""),
      assignedTo: String(data.assignedTo ?? ""),
      createdByName: String(data.createdByName ?? ""),
    };
  });

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <AtendimentoClient tickets={tickets} />
      </div>
    </main>
  );
}
