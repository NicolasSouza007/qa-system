import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PainelPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  return (
    <div className="bg-black min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-white text-3xl sm:text-4xl font-bold mb-2">
            Olá,{" "}
            <span className="text-sky-300">
              {session.user.name?.split(" ")[0]}
            </span>{" "}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Para onde você quer ir?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Kanban */}
          <Link
            href="/dashboard"
            className="group bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-sky-500 rounded-2xl p-6 sm:p-8 flex flex-col gap-4 duration-300"
          >
            <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center group-hover:bg-sky-500/30 duration-300">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg mb-1 group-hover:text-sky-300 duration-300">
                Board Kanban
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Visualize e gerencie as tasks do time em colunas organizadas por
                status.
              </p>
            </div>
            <span className="text-sky-400 text-sm font-medium flex items-center gap-1 mt-auto">
              Acessar board →
            </span>
          </Link>

          <Link
            href="/clientes"
            className="group bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-green-500 rounded-2xl p-6 sm:p-8 flex flex-col gap-4 duration-300 sm:col-span-2 lg:col-span-1"
          >
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 duration-300">
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
            <span className="text-green-400 text-sm font-medium flex items-center gap-1 mt-auto">
              Ver clientes →
            </span>
          </Link>

          {/* Tickets */}
          <Link
            href="/tickets"
            className="group bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-purple-500 rounded-2xl p-6 sm:p-8 flex flex-col gap-4 duration-300"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 duration-300">
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
            <span className="text-purple-400 text-sm font-medium flex items-center gap-1 mt-auto">
              Ver tickets →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
