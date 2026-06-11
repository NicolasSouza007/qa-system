import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";
import { transporter } from "@/app/lib/mailer"; // <- troca o import
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const userSnap = await adminDb.doc(`users/${session.user.id}`).get();
  if (userSnap.data()?.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { name, email } = await req.json();
  if (!name || !email) {
    return NextResponse.json(
      { error: "Nome e e-mail são obrigatórios" },
      { status: 400 },
    );
  }

  const existing = await adminDb
    .collection("invites")
    .where("email", "==", email.toLowerCase())
    .where("accepted", "==", false)
    .get();

  if (!existing.empty) {
    return NextResponse.json(
      { error: "Já existe um convite pendente para esse e-mail" },
      { status: 400 },
    );
  }

  const token = uuidv4();
  await adminDb.doc(`invites/${token}`).set({
    name,
    email: email.toLowerCase(),
    accepted: false,
    createdBy: session.user.id,
    createdAt: new Date(),
  });

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  try {
    await transporter.sendMail({
      from: `"QA System" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${session.user.name} te convidou para o QA System`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #fff; border-radius: 16px;">
          <h1 style="color: #7dd3fc; font-size: 24px; margin-bottom: 4px;">QA <span style="color: #fff;">System</span></h1>
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 32px;">Organize seus testes de forma prática e eficiente</p>

          <p style="color: #fff; font-size: 16px; margin-bottom: 8px;">Olá, <strong>${name}</strong>!</p>
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 32px;">
            <strong style="color: #fff;">${session.user.name}</strong> te convidou para fazer parte do time no QA System.
          </p>

          <a href="${inviteLink}"
            style="display: block; background: #0ea5e9; color: #fff; text-align: center; padding: 14px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; margin-bottom: 24px;">
            Aceitar convite
          </a>

          <p style="color: #4b5563; font-size: 12px; text-align: center;">
            Se você não esperava esse convite, pode ignorar este e-mail.
          </p>
        </div>
      `,
    });

    console.log("E-mail enviado com sucesso para:", email);
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    return NextResponse.json(
      { error: "Erro ao enviar e-mail" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
