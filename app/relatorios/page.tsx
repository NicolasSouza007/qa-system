import Link from "next/link";
import {
  ChartNoAxesCombined,
  Clock3,
  Users,
  Bug,
  ArrowUpRight,
} from "lucide-react";

const relatorios = [
  {
    titulo: "Visão geral",
    descricao: "Tendências e comparações",
    detalhe: "Acompanhe aberturas, resoluções e categorias.",
    href: "/relatorios/visao-geral",
    icone: ChartNoAxesCombined,
    destaque: true,
  },
  {
    titulo: "Atendimento",
    descricao: "Prazos e tempo de resolução",
    detalhe: "Analise o tempo de atendimento e os chamados pendentes.",
    href: "/relatorios/atendimento",
    icone: Clock3,
    destaque: false,
  },
  {
    titulo: "Equipe",
    descricao: "Desempenho dos técnicos",
    detalhe: "Consulte os resultados e a distribuição dos chamados.",
    href: "/relatorios/equipe",
    icone: Users,
    destaque: false,
  },
  {
    titulo: "Recorrências",
    descricao: "Bugs e problemas frequentes",
    detalhe: "Identifique categorias e problemas recorrentes.",
    href: "/relatorios/recorrencias",
    icone: Bug,
    destaque: false,
  },
];

export default function RelatoriosPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        {/* Cabeçalho */}
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium text-sky-400">
            ANÁLISE E INDICADORES
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">Relatórios</h1>

          <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Escolha um relatório para acompanhar os resultados, identificar
            tendências e entender melhor os chamados do seu workspace.
          </p>
        </header>

        {/* Cartões de navegação */}
        <section
          aria-label="Tipos de relatórios"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {relatorios.map((relatorio) => {
            const Icon = relatorio.icone;

            return (
              <Link
                key={relatorio.href}
                href={relatorio.href}
                className={`group flex min-h-44 flex-col justify-between rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5 ${
                  relatorio.destaque
                    ? "border-blue-900 bg-blue-950/90 hover:border-sky-500 hover:bg-blue-950"
                    : "border-zinc-800 bg-zinc-900 hover:border-sky-500/60 hover:bg-zinc-900/80"
                }`}
              >
                <div>
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
                      relatorio.destaque
                        ? "bg-sky-400/10 text-sky-300"
                        : "bg-zinc-800 text-zinc-300 group-hover:text-sky-300"
                    }`}
                  >
                    <Icon size={22} strokeWidth={1.8} />
                  </div>

                  <h2 className="text-lg font-semibold">{relatorio.titulo}</h2>

                  <p className="mt-1 text-sm text-sky-300">
                    {relatorio.descricao}
                  </p>

                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {relatorio.detalhe}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300 transition group-hover:text-sky-300">
                    Acessar relatório
                  </span>

                  <ArrowUpRight
                    size={18}
                    className="text-zinc-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-sky-300"
                  />
                </div>
              </Link>
            );
          })}
        </section>

        {/* Informação complementar */}
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="font-semibold">Sobre os relatórios</h2>

          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Cada relatório apresenta uma perspectiva diferente da operação.
            Utilize os filtros de período e as informações disponíveis para
            acompanhar tendências, avaliar o atendimento e identificar
            oportunidades de melhoria.
          </p>
        </section>
      </div>
    </main>
  );
}
