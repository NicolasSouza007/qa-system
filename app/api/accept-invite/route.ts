import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { token } = await req.json();
  const inviteRef = adminDb.doc(`invites/${token}`);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists)
    return NextResponse.json({ error: "Convite inválido" }, { status: 404 });

  const invite = inviteSnap.data()!;

  if (invite.email !== session.user.email) {
    return NextResponse.json(
      { error: "E-mail não corresponde" },
      { status: 403 },
    );
  }

  const { workspaceId, role } = invite;

  // atualiza ou cria o usuário
  await adminDb.doc(`users/${session.user.id}`).set(
    {
      name: session.user.name,
      email: session.user.email,
      photo: session.user.image,
      createdAt: new Date(),
    },
    { merge: true },
  );

  // adiciona como membro do workspace com o role do convite
  await adminDb
    .doc(`workspaceMembers/${workspaceId}/members/${session.user.id}`)
    .set({
      role,
      userId: session.user.id,
      joinedAt: new Date(),
    });

  // se for admin, atualiza o workspaceId no usuário
  if (role === "admin") {
    await adminDb.doc(`users/${session.user.id}`).update({
      workspaceId,
    });
  }

  await inviteRef.update({ accepted: true });

  return NextResponse.json({ ok: true });
}
