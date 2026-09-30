import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/app/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    // ============================================================
    // VALIDAÇÃO DOS DADOS
    // ============================================================

    if (!token || !password) {
      return NextResponse.json(
        {
          error: "Token e senha são obrigatórios.",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "A senha deve possuir pelo menos 6 caracteres.",
        },
        { status: 400 },
      );
    }

    // ============================================================
    // BUSCA O CONVITE
    // ============================================================

    const inviteRef = adminDb.doc(`invites/${token}`);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json(
        {
          error: "Convite inválido ou inexistente.",
        },
        { status: 404 },
      );
    }

    const invite = inviteSnap.data()!;

    // ============================================================
    // VERIFICA SE O CONVITE JÁ FOI ACEITO
    // ============================================================

    if (invite.accepted === true) {
      return NextResponse.json(
        {
          error: "Este convite já foi utilizado.",
        },
        { status: 400 },
      );
    }

    // ============================================================
    // DADOS DO CONVITE
    // ============================================================

    const email = invite.email;
    const workspaceId = invite.workspaceId;
    const role = invite.role;

    if (!email || !workspaceId || !role) {
      return NextResponse.json(
        {
          error: "O convite possui dados incompletos.",
        },
        { status: 400 },
      );
    }

    // ============================================================
    // PROCURA O USUÁRIO NO FIREBASE AUTH
    // ============================================================

    let userRecord;

    try {
      userRecord = await adminAuth.getUserByEmail(email);

      // ==========================================================
      // USUÁRIO JÁ EXISTE
      // Atualiza a senha
      // ==========================================================

      userRecord = await adminAuth.updateUser(userRecord.uid, {
        password,
      });
    } catch (error: any) {
      // ==========================================================
      // USUÁRIO NÃO EXISTE
      // Cria um novo usuário
      // ==========================================================

      if (error.code === "auth/user-not-found") {
        userRecord = await adminAuth.createUser({
          email,
          password,
          emailVerified: false,
        });
      } else {
        throw error;
      }
    }

    // ============================================================
    // SALVA / ATUALIZA USUÁRIO NO FIRESTORE
    // ============================================================

    await adminDb.doc(`users/${userRecord.uid}`).set(
      {
        name: invite.name ?? email.split("@")[0],
        email: email,
        photo: userRecord.photoURL ?? null,
        workspaceId,
        createdAt: new Date(),
      },
      {
        merge: true,
      },
    );

    // ============================================================
    // ADICIONA USUÁRIO AO WORKSPACE
    // ============================================================

    await adminDb
      .doc(`workspaceMembers/${workspaceId}/members/${userRecord.uid}`)
      .set({
        role,
        userId: userRecord.uid,
        joinedAt: new Date(),
      });

    // ============================================================
    // MARCA CONVITE COMO ACEITO
    // ============================================================

    await inviteRef.update({
      accepted: true,
      acceptedAt: new Date(),
      acceptedBy: userRecord.uid,
    });

    // ============================================================
    // RETORNO
    // ============================================================

    return NextResponse.json({
      success: true,
      message: "Convite aceito e senha definida com sucesso.",
      uid: userRecord.uid,
      email: userRecord.email,
    });
  } catch (error: any) {
    console.error("Erro ao aceitar convite:", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Não foi possível aceitar o convite.",
      },
      {
        status: 500,
      },
    );
  }
}
