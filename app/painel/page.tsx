import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { adminDb } from "@/app/lib/firebase-admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GiScarabBeetle } from "react-icons/gi";

const categories = [
  "Bug",
  "Melhoria",
  "Dúvida",
  "Chamados",
  "Segurança",
  "Outro",
];

export default async function PainelPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  /*
   * ============================================================
   * 1. DESCOBRIR O WORKSPACE DO USUÁRIO
   * ============================================================
   */

  const userDoc = await adminDb.doc(`users/${session.user.id}`).get();

  const userData = userDoc.data();

  if (!userData) {
    redirect("/");
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

      role = memberDoc.data().role ?? "member";

      workspaceId = memberDoc.ref.parent.parent?.id;
    }
  }

  if (!workspaceId) {
    redirect("/");
  }

  /*
   * ============================================================
   * 2. BUSCAR TODOS OS TICKETS DO WORKSPACE
   * ============================================================
   */

  const ticketsSnap = await adminDb
    .collection("tickets")
    .where("workspaceId", "==", workspaceId)
    .get();

  const tickets = ticketsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{
    id: string;
    title?: string;
    category?: string;
    status?: "open" | "closed";
    resolvedBy?: string;
    resolvedAt?: any;
    createdAt?: any;
  }>;

  /*
   * ============================================================
   * 3. MÉTRICAS PRINCIPAIS
   * ============================================================
   */

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "open",
  ).length;

  const closedTickets = tickets.filter(
    (ticket) => ticket.status === "closed",
  ).length;

  const bugTickets = tickets.filter(
    (ticket) => ticket.category?.toLowerCase() === "bug",
  ).length;

  /*
   * ============================================================
   * 4. TICKETS POR CATEGORIA
   * ============================================================
   */

  const categoryStats = categories.map((category) => ({
    name: category,
    count: tickets.filter(
      (ticket) => ticket.category?.toLowerCase() === category.toLowerCase(),
    ).length,
  }));

  const maxCategoryCount = Math.max(
    ...categoryStats.map((category) => category.count),
    1,
  );

  /*
   * ============================================================
   * 5. TICKETS RESOLVIDOS POR TÉCNICO
   * ============================================================
   */

  const resolvedByCount: Record<string, number> = {};

  for (const ticket of tickets) {
    if (!ticket.resolvedBy) continue;

    resolvedByCount[ticket.resolvedBy] =
      (resolvedByCount[ticket.resolvedBy] ?? 0) + 1;
  }

  const resolverIds = Object.keys(resolvedByCount);

  const resolverUsers = await Promise.all(
    resolverIds.map(async (userId) => {
      const doc = await adminDb.doc(`users/${userId}`).get();

      return {
        id: userId,
        name: doc.data()?.name ?? doc.data()?.displayName ?? "Usuário",
        photo: doc.data()?.photoURL ?? doc.data()?.image ?? "",
        count: resolvedByCount[userId],
      };
    }),
  );

  const teamStats = resolverUsers
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxTeamCount = Math.max(...teamStats.map((member) => member.count), 1);

  /*
   * ============================================================
   * 6. CHAMADOS RESOLVIDOS PELO USUÁRIO LOGADO
   * ============================================================
   */

  const myResolvedTickets = resolvedByCount[session.user.id] ?? 0;

  /*
   * ============================================================
   * 7. PERCENTUAL DE FINALIZAÇÃO
   * ============================================================
   */

  const closedPercentage =
    totalTickets > 0 ? Math.round((closedTickets / totalTickets) * 100) : 0;

  /*
   * ============================================================
   * 8. INTERFACE
   * ============================================================
   */

  return (
    <div className="bg-black min-h-screen px-4 sm:px-6 py-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* =====================================================
            CABEÇALHO
        ===================================================== */}

        <div className="mb-8">
          <h1 className="text-white text-3xl sm:text-4xl font-bold">
            Olá,{" "}
            <span className="text-sky-300">
              {session.user.name?.split(" ")[0]}
            </span>{" "}
            👋
          </h1>
        </div>

        {/* =====================================================
            ACESSO RÁPIDO
        ===================================================== */}

        <div className="mb-7">
          <div className="mb-4">
            <h2 className="text-white text-xl font-semibold">Acesso rápido</h2>

            <p className="text-gray-500 text-sm mt-1">
              Acesse rapidamente as principais áreas do sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* KANBAN */}

            <Link
              href="/dashboard"
              className="group bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-sky-500 rounded-2xl p-4 flex flex-col gap-3 duration-300"
            >
              <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center group-hover:bg-sky-500/30 duration-300">
                <span className="text-2xl">📋</span>
              </div>

              <div>
                <h2 className="text-white font-semibold text-lg mb-1 group-hover:text-sky-300 duration-300">
                  Board Kanban
                </h2>

                <p className="text-gray-400 text-sm leading-relaxed">
                  Visualize e gerencie as tasks do time em colunas organizadas
                  por status.
                </p>
              </div>

              <span className="text-sky-400 text-sm font-medium mt-auto">
                Acessar board →
              </span>
            </Link>

            {/* CLIENTES */}

            <Link
              href="/clientes"
              className="group bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-green-500 rounded-2xl p-4 flex flex-col gap-3 duration-300"
            >
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 duration-300">
                <span className="text-2xl">👥</span>
              </div>

              <div>
                <h2 className="text-white font-semibold text-lg mb-1 group-hover:text-green-300 duration-300">
                  Clientes
                </h2>

                <p className="text-gray-400 text-sm leading-relaxed">
                  Cadastre e gerencie os clientes para vincular aos chamados.
                </p>
              </div>

              <span className="text-green-400 text-sm font-medium mt-auto">
                Ver clientes →
              </span>
            </Link>

            {/* TICKETS */}

            <Link
              href="/tickets"
              className="group bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-purple-500 rounded-2xl p-4 flex flex-col gap-3 duration-300"
            >
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 duration-300">
                <span className="text-2xl">🎫</span>
              </div>

              <div>
                <h2 className="text-white font-semibold text-lg mb-1 group-hover:text-purple-300 duration-300">
                  Tickets / Chamados
                </h2>

                <p className="text-gray-400 text-sm leading-relaxed">
                  Abra e acompanhe chamados, bugs e solicitações atribuídas ao
                  time.
                </p>
              </div>

              <span className="text-purple-400 text-sm font-medium mt-auto">
                Ver tickets →
              </span>
            </Link>
          </div>
        </div>

        {/* =====================================================
            CARDS PRINCIPAIS
        ===================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {/* TOTAL */}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de chamados</p>

                <p className="text-white text-3xl font-bold mt-2">
                  {totalTickets}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                <span className="text-2xl">🎫</span>
              </div>
            </div>
          </div>

          {/* ABERTOS */}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Em aberto</p>

                <p className="text-yellow-400 text-3xl font-bold mt-2">
                  {openTickets}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <span className="text-2xl">🟡</span>
              </div>
            </div>
          </div>

          {/* FINALIZADOS */}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Finalizados</p>

                <p className="text-green-400 text-3xl font-bold mt-2">
                  {closedTickets}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          {/* BUGS */}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Bugs</p>

                <p className="text-red-400 text-3xl font-bold mt-2">
                  {bugTickets}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <GiScarabBeetle className="text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            CONTEÚDO PRINCIPAL
        ===================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* CATEGORIAS */}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-white text-lg font-semibold">
                Chamados por categoria
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Distribuição dos chamados do workspace.
              </p>
            </div>

            <div className="space-y-5">
              {categoryStats.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-sm">
                      {category.name}
                    </span>

                    <span className="text-white text-sm font-semibold">
                      {category.count}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full transition-all"
                      style={{
                        width: `${(category.count / maxCategoryCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DESEMPENHO */}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-white text-lg font-semibold">
                Chamados resolvidos
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Quantidade de chamados finalizados por técnico.
              </p>
            </div>

            {teamStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-4xl mb-3">👨‍💻</span>

                <p className="text-gray-400 text-sm">
                  Ainda não existem chamados com responsável pela resolução.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {teamStats.map((member) => (
                  <div key={member.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <span className="text-xs text-gray-300">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        <span className="text-gray-300 text-sm">
                          {member.name}
                        </span>
                      </div>

                      <span className="text-white text-sm font-semibold">
                        {member.count}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all"
                        style={{
                          width: `${(member.count / maxTeamCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            SEU DESEMPENHO
        ===================================================== */}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-white text-lg font-semibold">
                Seu desempenho
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Chamados que você registrou como resolvidos.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-gray-400 text-sm">Chamados resolvidos</p>

              <p className="text-sky-300 text-3xl font-bold">
                {myResolvedTickets}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Taxa geral de finalização</span>

              <span className="text-gray-300 font-medium">
                {closedPercentage}%
              </span>
            </div>

            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full"
                style={{
                  width: `${closedPercentage}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
