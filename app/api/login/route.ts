import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { idToken, workspaceCode } = body;

    if (!idToken || !workspaceCode) {
      return NextResponse.json(
        {
          error: "Token e código da conta são obrigatórios.",
        },
        { status: 400 },
      );
    }

    /*
     * 1. Validar o usuário autenticado no Firebase
     */

    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error("Token Firebase inválido:", error);

      return NextResponse.json(
        {
          error: "Sessão do Firebase inválida ou expirada.",
        },
        { status: 401 },
      );
    }

    const userId = decodedToken.uid;

    /*
     * 2. Procurar o workspace pelo Code
     *
     * Estrutura:
     *
     * workspaces
     *   └── workspace-youdead
     *       └── Code: "QASYS-2024"
     */

    const workspaceSnap = await adminDb
      .collection("workspaces")
      .where("Code", "==", workspaceCode.trim().toUpperCase())
      .limit(1)
      .get();

    if (workspaceSnap.empty) {
      return NextResponse.json(
        {
          error: "Conta não encontrada.",
        },
        { status: 404 },
      );
    }

    const workspaceDoc = workspaceSnap.docs[0];

    const workspaceId = workspaceDoc.id;

    /*
     * 3. Verificar se o usuário pertence ao workspace
     *
     * workspaceMembers
     *   └── workspaceId
     *       └── members
     *           └── userId
     */

    const memberRef = adminDb.doc(
      `workspaceMembers/${workspaceId}/members/${userId}`,
    );

    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      return NextResponse.json(
        {
          error:
            "Seu usuário não possui acesso a esta conta. Verifique o código informado.",
        },
        { status: 403 },
      );
    }

    const memberData = memberDoc.data();

    return NextResponse.json({
      success: true,
      userId,
      workspaceId,
      role: memberData?.role ?? "member",
    });
  } catch (error) {
    console.error("Erro no login:", error);

    return NextResponse.json(
      {
        error: "Ocorreu um erro ao validar o acesso.",
      },
      { status: 500 },
    );
  }
}
