import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";
import { redirect } from "next/navigation";
import { RelatoriosClient } from "@/app/components/relatorios-client";

function toISOStringSafe(value: unknown): string | null {
  if (!value) return null;

  // Firestore Timestamp
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

  // Date, string ou número
  const date =
    value instanceof Date ? value : new Date(value as string | number);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export default async function RelatoriosPage() {
  const session = await getServerSession(authOptions);

  // 1. Validar autenticação
  if (!session?.user?.id) {
    redirect("/");
  }

  // 2. Descobrir o workspace do usuário
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

    // Não permite acessar um workspace sem vínculo válido.
    if (!memberDoc.exists) {
      redirect("/");
    }
  } else {
    const memberSnap = await adminDb
      .collectionGroup("members")
      .where("userId", "==", session.user.id)
      .get();

    if (!memberSnap.empty) {
      const memberDoc = memberSnap.docs[0];

      workspaceId = memberDoc.ref.parent.parent?.id;
    }
  }

  if (!workspaceId) {
    redirect("/");
  }

  // 3. Buscar somente os chamados deste workspace
  const ticketsSnap = await adminDb
    .collection("tickets")
    .where("workspaceId", "==", workspaceId)
    .get();

  // 4. Preparar os dados para o componente client-side
  // Os valores são convertidos para strings e tipos serializáveis.
  const tickets = ticketsSnap.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      category: String(data.category ?? "Outro"),
      priority: String(data.priority ?? "medium"),
      status: String(data.status ?? "open"),
      createdAt: toISOStringSafe(data.createdAt),
      resolvedAt: toISOStringSafe(data.resolvedAt),
      createdByName: String(data.createdByName ?? ""),
      assignedTo: String(data.assignedTo ?? ""),
      clientName: String(data.clientName ?? ""),
    };
  });

  // 5. Renderizar a nova Visão geral dos relatórios
  return (
    <div className="min-h-screen bg-black px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <RelatoriosClient tickets={tickets} />
      </div>
    </div>
  );
}
