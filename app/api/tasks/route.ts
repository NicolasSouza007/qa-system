import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { title, module, priority, column, assignedTo, workspaceId } =
    await req.json();

  if (!title || !module || !assignedTo || !workspaceId) {
    return NextResponse.json(
      { error: "Campos obrigatórios faltando" },
      { status: 400 },
    );
  }

  // cria a task
  const taskRef = await adminDb.collection(`tasks/${workspaceId}/tasks`).add({
    title,
    module,
    priority,
    column,
    assignedTo,
    workspaceId,
    createdBy: session.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // cria notificação para o membro
  await adminDb.collection("notifications").add({
    userId: assignedTo,
    workspaceId,
    taskId: taskRef.id,
    taskTitle: title,
    message: `${session.user.name} atribuiu uma nova task para você`,
    read: false,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, taskId: taskRef.id });
}
