import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  console.log("session user:", session?.user);

  if (!session?.user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { token } = await req.json();
  console.log("token recebido:", token);

  const inviteRef = adminDb.doc(`invites/${token}`);
  const inviteSnap = await inviteRef.get();

  console.log("invite existe?", inviteSnap.exists);
  console.log("invite data:", inviteSnap.data());

  if (!inviteSnap.exists)
    return NextResponse.json({ error: "Convite inválido" }, { status: 404 });

  const invite = inviteSnap.data()!;

  console.log("email do invite:", invite.email);
  console.log("email da session:", session.user.email);

  if (invite.email !== session.user.email) {
    return NextResponse.json(
      { error: "E-mail não corresponde" },
      { status: 403 },
    );
  }

  await adminDb.doc(`users/${session.user.id}`).set(
    {
      name: session.user.name,
      email: session.user.email,
      photo: session.user.image,
      role: "member",
      createdAt: new Date(),
    },
    { merge: true },
  );

  await inviteRef.update({ accepted: true });

  console.log("convite aceito com sucesso!");

  return NextResponse.json({ ok: true });
}
