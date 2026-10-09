"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Hourglass,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Ticket = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string | null;
  resolvedAt: string | null;
  clientName: string;
  assignedTo: string;
  createdByName: string;
};

type Props = {
  tickets: Ticket[];
};

type Period = "7" | "30" | "month";

const DAY = 24 * 60 * 60 * 1000;

function parseDate(value: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(value: string | null) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

function formatDuration(milliseconds: number) {
  const totalHours = Math.floor(milliseconds / (60 * 60 * 1000));

  if (totalHours < 24) {
    return `${totalHours}h`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return `${days}d ${hours}h`;
}

function priorityLabel(priority: string) {
  const value = priority.toLowerCase();

  if (value === "high" || value === "alta") return "Alta";
  if (value === "medium" || value === "média" || value === "media") {
    return "Média";
  }
  if (value === "low" || value === "baixa") return "Baixa";

  return priority || "Não informada";
}

function priorityColor(priority: string) {
  const value = priority.toLowerCase();

  if (value === "high" || value === "alta") {
    return "text-red-400 bg-red-500/10";
  }

  if (value === "medium" || value === "média" || value === "media") {
    return "text-amber-300 bg-amber-500/10";
  }

  return "text-emerald-400 bg-emerald-500/10";
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
        </div>

        <div className="rounded-xl bg-zinc-800 p-3">
          <Icon size={22} className={color} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}

export function AtendimentoClient({ tickets }: Props) {
  const [period, setPeriod] = useState<Period>("30");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(false);

  const now = new Date();

  const { start, end } = useMemo(() => {
    const today = startOfDay(now);
    let startDate = new Date(today);

    if (period === "7") {
      startDate.setDate(startDate.getDate() - 6);
    } else if (period === "30") {
      startDate.setDate(startDate.getDate() - 29);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    return {
      start: startDate,
      end: new Date(today.getTime() + DAY - 1),
    };
  }, [period]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(tickets.map((ticket) => ticket.category).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [tickets],
  );

  const filteredTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) => category === "all" || ticket.category === category,
      ),
    [tickets, category],
  );

  // Resolvidos no período selecionado.
  const resolvedInPeriod = filteredTickets.filter((ticket) => {
    const resolved = parseDate(ticket.resolvedAt);
    return (
      ticket.status === "closed" &&
      resolved !== null &&
      resolved >= start &&
      resolved <= end
    );
  });

  // Tempo de resolução somente quando as duas datas são válidas.
  const resolvedDurations = resolvedInPeriod
    .map((ticket) => {
      const created = parseDate(ticket.createdAt);
      const resolved = parseDate(ticket.resolvedAt);

      if (!created || !resolved || resolved < created) return null;

      return {
        ticket,
        duration: resolved.getTime() - created.getTime(),
      };
    })
    .filter(
      (item): item is { ticket: Ticket; duration: number } => item !== null,
    );

  const averageResolution =
    resolvedDurations.length > 0
      ? resolvedDurations.reduce((sum, item) => sum + item.duration, 0) /
        resolvedDurations.length
      : null;

  // Pendências atuais, independentemente da data de abertura.
  const pendingTickets = filteredTickets
    .filter((ticket) => {
      if (ticket.status !== "open") return false;

      const created = parseDate(ticket.createdAt);
      return created !== null && created <= now;
    })
    .map((ticket) => ({
      ...ticket,
      age: now.getTime() - parseDate(ticket.createdAt)!.getTime(),
    }))
    .sort((a, b) => b.age - a.age);

  const pendingUnder24 = pendingTickets.filter(
    (ticket) => ticket.age < DAY,
  ).length;

  const pending1to3Days = pendingTickets.filter(
    (ticket) => ticket.age >= DAY && ticket.age < 3 * DAY,
  ).length;

  const pendingOver3Days = pendingTickets.filter(
    (ticket) => ticket.age >= 3 * DAY,
  ).length;

  // Tempo médio de resolução por prioridade.
  const priorityStats = ["high", "medium", "low"].map((priority) => {
    const matching = resolvedDurations.filter(
      (item) => item.ticket.priority.toLowerCase() === priority,
    );

    const average =
      matching.length > 0
        ? matching.reduce((sum, item) => sum + item.duration, 0) /
          matching.length
        : null;

    return {
      priority,
      label: priorityLabel(priority),
      count: matching.length,
      average,
    };
  });

  const maxPriorityAverage = Math.max(
    1,
    ...priorityStats.map((item) => item.average ?? 0),
  );

  const exportPendingCSV = () => {
    const rows = [
      [
        "Título",
        "Cliente",
        "Categoria",
        "Prioridade",
        "Data de abertura",
        "Tempo pendente",
      ],
      ...pendingTickets.map((ticket) => [
        ticket.title,
        ticket.clientName,
        ticket.category,
        priorityLabel(ticket.priority),
        formatDate(ticket.createdAt),
        formatDuration(ticket.age),
      ]),
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(";"),
        )
        .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "chamados-pendentes.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/relatorios"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-sky-300"
          >
            <ArrowLeft size={16} />
            Voltar aos relatórios
          </Link>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
              <Clock3 size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Relatório de Atendimento
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Prazos, tempo de resolução e chamados pendentes.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={exportPendingCSV}
          className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium transition hover:border-sky-500 hover:bg-sky-500/10"
        >
          Exportar pendências CSV
        </button>
      </header>

      {/* Filtros */}
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="period" className="mb-2 block text-sm text-zinc-400">
            Período de resolução
          </label>

          <select
            id="period"
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="month">Mês atual</option>
          </select>
        </div>

        <div className="flex-1">
          <label
            htmlFor="category"
            className="mb-2 block text-sm text-zinc-400"
          >
            Categoria
          </label>

          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-zinc-500 sm:pb-3">
          {start.toLocaleDateString("pt-BR")} até{" "}
          {end.toLocaleDateString("pt-BR")}
        </div>
      </section>

      {/* Indicadores */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tempo médio de resolução"
          value={
            averageResolution === null ? "—" : formatDuration(averageResolution)
          }
          description={`${resolvedDurations.length} chamado(s) com datas válidas resolvidos no período.`}
          icon={Clock3}
          color="text-sky-300"
        />

        <StatCard
          title="Pendentes atualmente"
          value={pendingTickets.length}
          description="Chamados que ainda estão com status aberto."
          icon={Hourglass}
          color="text-amber-300"
        />

        <StatCard
          title="Pendentes há mais de 3 dias"
          value={pendingOver3Days}
          description="Chamados abertos que merecem acompanhamento prioritário."
          icon={AlertTriangle}
          color="text-red-400"
        />

        <StatCard
          title="Resolvidos no período"
          value={resolvedInPeriod.length}
          description="Chamados com data de resolução dentro do período selecionado."
          icon={CheckCircle2}
          color="text-emerald-400"
        />
      </section>

      {/* Idade das pendências */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Idade dos chamados pendentes</h2>

        <p className="mt-1 text-sm text-zinc-400">
          Há quanto tempo os chamados atualmente abertos aguardam resolução.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              label: "Menos de 24 horas",
              value: pendingUnder24,
              color: "bg-emerald-400",
              text: "text-emerald-400",
            },
            {
              label: "De 1 a 3 dias",
              value: pending1to3Days,
              color: "bg-amber-400",
              text: "text-amber-300",
            },
            {
              label: "Mais de 3 dias",
              value: pendingOver3Days,
              color: "bg-red-400",
              text: "text-red-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-zinc-400">{item.label}</p>
                <span className={`text-2xl font-bold ${item.text}`}>
                  {item.value}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{
                    width: `${
                      pendingTickets.length > 0
                        ? (item.value / pendingTickets.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tempo médio por prioridade */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">
          Tempo médio de resolução por prioridade
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Considere estes dados como referência para entender a duração dos
          atendimentos.
        </p>

        <div className="mt-6 space-y-5">
          {priorityStats.map((item) => (
            <div key={item.priority}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityColor(item.priority)}`}
                >
                  {item.label}
                </span>

                <span className="text-sm text-zinc-300">
                  {item.average === null
                    ? "Sem dados"
                    : formatDuration(item.average)}
                  <span className="ml-2 text-xs text-zinc-500">
                    ({item.count} chamados)
                  </span>
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${
                    item.priority === "high"
                      ? "bg-red-400"
                      : item.priority === "medium"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                  style={{
                    width: `${
                      item.average === null
                        ? 0
                        : (item.average / maxPriorityAverage) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lista de atenção */}
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Chamados que precisam de atenção
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {pendingTickets.length} chamado(s) ainda aberto(s), ordenados
              pelos mais antigos.
            </p>
          </div>

          {pendingTickets.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm transition hover:border-sky-500 hover:text-sky-300"
            >
              {expanded ? "Mostrar menos" : "Expandir"}
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-5 py-3 font-medium">Chamado</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Prioridade</th>
                <th className="px-5 py-3 font-medium">Abertura</th>
                <th className="px-5 py-3 font-medium">Tempo pendente</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {pendingTickets
                .slice(0, expanded ? pendingTickets.length : 5)
                .map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-white/[0.03]">
                    <td className="max-w-[280px] px-5 py-4">
                      <p className="truncate font-medium">
                        {ticket.title || "Sem título"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {ticket.category}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {ticket.clientName || "Não informado"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${priorityColor(ticket.priority)}`}
                      >
                        {priorityLabel(ticket.priority)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-zinc-400">
                      {formatDate(ticket.createdAt)}
                    </td>

                    <td className="px-5 py-4 font-medium text-amber-300">
                      {formatDuration(ticket.age)}
                    </td>
                  </tr>
                ))}

              {pendingTickets.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-zinc-500"
                  >
                    Nenhum chamado pendente encontrado para esta categoria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
