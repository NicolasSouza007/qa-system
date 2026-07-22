import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";

// marca notificação como lida
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { notificationId } = await req.json();
  await adminDb.doc(`notifications/${notificationId}`).update({ read: true });

  return NextResponse.json({ ok: true });
}
