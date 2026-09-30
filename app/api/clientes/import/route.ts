import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";

type ImportCliente = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  document?: string;
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function cleanValue(value: unknown): string {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    /*
     * ============================================================
     * 1. DESCOBRIR O WORKSPACE DO USUÁRIO
     * ============================================================
     */

    const userDoc = await adminDb.doc(`users/${session.user.id}`).get();

    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

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

        role = memberDoc.data()?.role ?? "member";

        workspaceId = memberDoc.ref.parent.parent?.id;
      }
    }

    /*
     * Somente administrador pode importar clientes.
     */

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem importar clientes." },
        { status: 403 },
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace não encontrado." },
        { status: 400 },
      );
    }

    /*
     * ============================================================
     * 2. RECEBER CLIENTES
     * ============================================================
     */

    const body = await request.json();

    const clientes = body.clientes as ImportCliente[];

    if (!Array.isArray(clientes)) {
      return NextResponse.json(
        { error: "Formato de importação inválido." },
        { status: 400 },
      );
    }

    if (clientes.length === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente encontrado." },
        { status: 400 },
      );
    }

    if (clientes.length > 5000) {
      return NextResponse.json(
        {
          error:
            "A planilha possui muitos registros. O limite é de 5.000 clientes por importação.",
        },
        { status: 400 },
      );
    }

    /*
     * ============================================================
     * 3. BUSCAR CLIENTES EXISTENTES
     * ============================================================
     */

    const existingSnap = await adminDb
      .collection("clientes")
      .where("workspaceId", "==", workspaceId)
      .get();

    const existingClients = existingSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      address?: string;
      document?: string;
    }>;

    const existingDocuments = new Set(
      existingClients
        .map((client) => normalize(client.document))
        .filter(Boolean),
    );

    const existingEmails = new Set(
      existingClients.map((client) => normalize(client.email)).filter(Boolean),
    );

    const existingNames = new Set(
      existingClients
        .map(
          (client) => `${normalize(client.name)}|${normalize(client.company)}`,
        )
        .filter((value) => value !== "|"),
    );

    /*
     * ============================================================
     * 4. VALIDAR E PREPARAR IMPORTAÇÃO
     * ============================================================
     */

    const validClients: ImportCliente[] = [];

    const errors: Array<{
      line: number;
      reason: string;
    }> = [];

    const importedDocuments = new Set<string>();
    const importedEmails = new Set<string>();
    const importedNames = new Set<string>();

    clientes.forEach((cliente, index) => {
      const line = index + 2;

      const name = cleanValue(cliente.name);
      const email = cleanValue(cliente.email);
      const phone = cleanValue(cliente.phone);
      const company = cleanValue(cliente.company);
      const address = cleanValue(cliente.address);
      const document = cleanValue(cliente.document);

      if (!name) {
        errors.push({ line, reason: "Nome é obrigatório." });
        return;
      }

      if (!phone) {
        errors.push({ line, reason: "Telefone é obrigatório." });
        return;
      }

      if (!company) {
        errors.push({ line, reason: "Empresa é obrigatória." });
        return;
      }

      if (!document) {
        errors.push({ line, reason: "CNPJ/CPF é obrigatório." });
        return;
      }

      const normalizedDocument = normalize(document);
      const normalizedEmail = normalize(email);

      const normalizedName = normalize(name);
      const normalizedCompany = normalize(company);

      const normalizedNameKey = `${normalizedName}|${normalizedCompany}`;

      /*
       * Verifica duplicados dentro dos clientes existentes.
       */

      if (normalizedDocument && existingDocuments.has(normalizedDocument)) {
        errors.push({
          line,
          reason: "Cliente com este CPF/CNPJ já está cadastrado.",
        });

        return;
      }

      if (normalizedEmail && existingEmails.has(normalizedEmail)) {
        errors.push({
          line,
          reason: "Cliente com este e-mail já está cadastrado.",
        });

        return;
      }

      if (existingNames.has(normalizedNameKey)) {
        errors.push({
          line,
          reason: "Cliente com este nome e empresa já está cadastrado.",
        });

        return;
      }

      /*
       * Verifica duplicados dentro da própria planilha.
       */

      if (normalizedDocument && importedDocuments.has(normalizedDocument)) {
        errors.push({
          line,
          reason: "CPF/CNPJ duplicado dentro da própria planilha.",
        });

        return;
      }

      if (normalizedEmail && importedEmails.has(normalizedEmail)) {
        errors.push({
          line,
          reason: "E-mail duplicado dentro da própria planilha.",
        });

        return;
      }

      if (importedNames.has(normalizedNameKey)) {
        errors.push({
          line,
          reason: "Nome e empresa duplicados dentro da própria planilha.",
        });

        return;
      }

      /*
       * Registra para evitar duplicações futuras na mesma planilha.
       */

      if (normalizedDocument) {
        importedDocuments.add(normalizedDocument);
      }

      if (normalizedEmail) {
        importedEmails.add(normalizedEmail);
      }

      importedNames.add(normalizedNameKey);

      validClients.push({
        name,
        email,
        phone,
        company,
        address,
        document,
      });
    });

    /*
     * ============================================================
     * 5. GRAVAR NO FIRESTORE
     * ============================================================
     *
     * Firestore permite até 500 operações por batch.
     * Por isso dividimos em lotes.
     */

    let importedCount = 0;

    for (let i = 0; i < validClients.length; i += 500) {
      const chunk = validClients.slice(i, i + 500);

      const batch = adminDb.batch();

      chunk.forEach((cliente) => {
        const clienteRef = adminDb.collection("clientes").doc();

        batch.set(clienteRef, {
          ...cliente,
          workspaceId,
          createdAt: new Date(),
          importedAt: new Date(),
          importedBy: session.user.id,
        });
      });

      await batch.commit();

      importedCount += chunk.length;
    }

    /*
     * ============================================================
     * 6. RETORNO
     * ============================================================
     */

    return NextResponse.json({
      success: true,
      imported: importedCount,
      errors,
      skipped: errors.length,
    });
  } catch (error) {
    console.error("Erro ao importar clientes:", error);

    return NextResponse.json(
      {
        error: "Ocorreu um erro ao importar os clientes.",
      },
      { status: 500 },
    );
  }
}
