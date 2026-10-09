"use client";

import { useMemo, useState } from "react";

type TicketReport = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: "high" | "medium" | "low" | string;
  status?: "open" | "closed" | string;
  createdAt?: string | null;
  resolvedAt?: string | null;
  createdByName?: string;
  assignedTo?: string;
  clientName?: string;
};

type Period = "7" | "30" | "month" | "custom";

type Props = {
  tickets: TicketReport[];
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function statusLabel(status?: string) {
  if (status === "closed") return "Resolvido";
  if (status === "open") return "Aberto";
  return status || "Não informado";
}

function priorityLabel(priority?: string) {
  if (priority === "high") return "Alta";
  if (priority === "medium") return "Média";
  if (priority === "low") return "Baixa";
  return priority || "Não informada";
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

export function RelatoriosClient({ tickets }: Props) {
  const [period, setPeriod] = useState<Period>("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { start, end, previousStart, previousEnd } = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    let selectedStart = new Date(today);

    if (period === "7") {
      selectedStart.setDate(selectedStart.getDate() - 6);
    } else if (period === "30") {
      selectedStart.setDate(selectedStart.getDate() - 29);
    } else if (period === "month") {
      selectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (customStart) {
      selectedStart = startOfDay(new Date(`${customStart}T00:00:00`));
    }

    let selectedEnd = today;

    if (period === "custom" && customEnd) {
      selectedEnd = startOfDay(new Date(`${customEnd}T00:00:00`));
    }

    // Não permite que o fim do período fique antes do início.
    if (selectedEnd < selectedStart) {
      selectedEnd = new Date(selectedStart);
    }

    const duration =
      Math.round((selectedEnd.getTime() - selectedStart.getTime()) / 86400000) +
      1;

    const priorEnd = new Date(selectedStart);
    priorEnd.setDate(priorEnd.getDate() - 1);

    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - duration + 1);

    return {
      start: selectedStart,
      end: new Date(selectedEnd.getTime() + 86400000 - 1),
      previousStart: priorStart,
      previousEnd: new Date(priorEnd.getTime() + 86400000 - 1),
    };
  }, [period, customStart, customEnd]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        tickets
          .map((ticket) => ticket.category?.trim())
          .filter((category): category is string => Boolean(category)),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (categoryFilter !== "all" && ticket.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, categoryFilter]);

  const current = useMemo(() => {
    return filteredTickets.filter((ticket) => {
      const created = parseDate(ticket.createdAt);
      const resolved = parseDate(ticket.resolvedAt);

      return (
        (created !== null && created >= start && created <= end) ||
        (resolved !== null && resolved >= start && resolved <= end)
      );
    });
  }, [filteredTickets, start, end]);

  const previous = useMemo(() => {
    return filteredTickets.filter((ticket) => {
      const created = parseDate(ticket.createdAt);
      const resolved = parseDate(ticket.resolvedAt);

      return (
        (created !== null &&
          created >= previousStart &&
          created <= previousEnd) ||
        (resolved !== null &&
          resolved >= previousStart &&
          resolved <= previousEnd)
      );
    });
  }, [filteredTickets, previousStart, previousEnd]);

  const opened = current.filter((ticket) => {
    const date = parseDate(ticket.createdAt);
    return date !== null && date >= start && date <= end;
  });

  const resolved = current.filter((ticket) => {
    const date = parseDate(ticket.resolvedAt);
    return date !== null && date >= start && date <= end;
  });

  const previousOpened = previous.filter((ticket) => {
    const date = parseDate(ticket.createdAt);
    return date !== null && date >= previousStart && date <= previousEnd;
  });

  const previousResolved = previous.filter((ticket) => {
    const date = parseDate(ticket.resolvedAt);
    return date !== null && date >= previousStart && date <= previousEnd;
  });

  const comparison = (value: number, oldValue: number) => {
    if (oldValue === 0) {
      return value === 0 ? "Sem alteração" : "Sem base anterior";
    }

    const change = ((value - oldValue) / oldValue) * 100;
    const formatted = Math.abs(change).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    });

    return `${change > 0 ? "+" : change < 0 ? "-" : ""}${formatted}% em relação ao período anterior`;
  };

  const chartData = useMemo(() => {
    const days: { date: Date; opened: number; resolved: number }[] = [];

    const cursor = new Date(start);
    const lastDay = startOfDay(end);

    while (cursor <= lastDay) {
      const dayStart = startOfDay(cursor);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const openedCount = opened.filter((ticket) => {
        const date = parseDate(ticket.createdAt);
        return date !== null && date >= dayStart && date < dayEnd;
      }).length;

      const resolvedCount = resolved.filter((ticket) => {
        const date = parseDate(ticket.resolvedAt);
        return date !== null && date >= dayStart && date < dayEnd;
      }).length;

      days.push({
        date: new Date(dayStart),
        opened: openedCount,
        resolved: resolvedCount,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    // Para intervalos muito longos, agrupa os dias em aproximadamente 30 pontos.
    if (days.length > 45) {
      const chunkSize = Math.ceil(days.length / 30);
      const grouped: typeof days = [];

      for (let i = 0; i < days.length; i += chunkSize) {
        const chunk = days.slice(i, i + chunkSize);
        grouped.push({
          date: chunk[0].date,
          opened: chunk.reduce((sum, day) => sum + day.opened, 0),
          resolved: chunk.reduce((sum, day) => sum + day.resolved, 0),
        });
      }

      return grouped;
    }

    return days;
  }, [start, end, opened, resolved]);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();

    opened.forEach((ticket) => {
      const category = ticket.category || "Não informado";
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    return Array.from(counts, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [opened]);

  const maxChartValue = Math.max(
    1,
    ...chartData.map((item) => Math.max(item.opened, item.resolved)),
  );

  const chartPoints = (key: "opened" | "resolved") => {
    if (chartData.length === 1) {
      return `160,${100 - (chartData[0][key] / maxChartValue) * 80}`;
    }

    return chartData
      .map((item, index) => {
        const x = 12 + (index / (chartData.length - 1)) * 296;
        const y = 100 - (item[key] / maxChartValue) * 80;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const exportCSV = () => {
    const rows = [
      [
        "Título",
        "Categoria",
        "Prioridade",
        "Status atual",
        "Cliente",
        "Solicitante",
        "Data de abertura",
        "Data de resolução",
      ],
      ...current.map((ticket) => [
        ticket.title,
        ticket.category,
        priorityLabel(ticket.priority),
        statusLabel(ticket.status),
        ticket.clientName,
        ticket.createdByName,
        ticket.createdAt ? formatDate(new Date(ticket.createdAt)) : "",
        ticket.resolvedAt ? formatDate(new Date(ticket.resolvedAt)) : "",
      ]),
    ];

    const csv =
      "\uFEFF" + rows.map((row) => row.map(csvValue).join(";")).join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `relatorio-chamados-${formatDate(start).replaceAll("/", "-")}-${formatDate(end).replaceAll("/", "-")}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const [expanded, setExpanded] = useState(false);

  return (
    <main className="space-y-6 text-white">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Analise a evolução dos chamados e identifique padrões de
            atendimento.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Exportar CSV
        </button>
      </header>

      <section className="rounded-xl border border-white/10 bg-zinc-900 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Período</label>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="month">Mês atual</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {period === "custom" && (
            <>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Data inicial
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Data final
                </label>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Categoria
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Período analisado: {formatDate(start)} até {formatDate(end)}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chamados abertos no período"
          value={opened.length}
          detail={comparison(opened.length, previousOpened.length)}
        />
        <StatCard
          label="Chamados resolvidos no período"
          value={resolved.length}
          detail={comparison(resolved.length, previousResolved.length)}
        />
        <StatCard
          label="Saldo de aberturas"
          value={opened.length - resolved.length}
          detail="Abertos no período menos resolvidos no período"
        />
        <StatCard
          label="Categorias identificadas"
          value={categoryStats.length}
          detail="Categorias com chamados abertos no intervalo"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-900 p-5 xl:col-span-2">
          <div className="mb-5">
            <h2 className="font-semibold">Aberturas x resoluções</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Quantidade de chamados abertos e resolvidos em cada dia ou
              agrupamento.
            </p>
          </div>

          {chartData.length > 0 ? (
            <>
              <svg
                viewBox="0 0 320 125"
                role="img"
                aria-label="Gráfico de chamados abertos e resolvidos"
                className="h-auto w-full overflow-visible"
              >
                {[20, 40, 60, 80, 100].map((y) => (
                  <line
                    key={y}
                    x1="10"
                    y1={y}
                    x2="310"
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.12"
                    strokeDasharray="3 4"
                  />
                ))}

                <polyline
                  points={chartPoints("opened")}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                <polyline
                  points={chartPoints("resolved")}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {chartData.map((item, index) => {
                  const x =
                    chartData.length === 1
                      ? 160
                      : 12 + (index / (chartData.length - 1)) * 296;

                  return (
                    <g key={`${item.date.toISOString()}-${index}`}>
                      <circle
                        cx={x}
                        cy={100 - (item.opened / maxChartValue) * 80}
                        r="2.5"
                        fill="#38bdf8"
                      />
                      <circle
                        cx={x}
                        cy={100 - (item.resolved / maxChartValue) * 80}
                        r="2.5"
                        fill="#34d399"
                      />
                    </g>
                  );
                })}
              </svg>

              <div className="mt-4 flex flex-wrap gap-5 text-sm">
                <span className="flex items-center gap-2 text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                  Abertos
                </span>
                <span className="flex items-center gap-2 text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Resolvidos
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {chartData
                  .filter((_, index) => {
                    const step = Math.max(1, Math.ceil(chartData.length / 4));
                    return index % step === 0;
                  })
                  .map((item, index) => (
                    <div
                      key={`${item.date.toISOString()}-${index}`}
                      className="rounded-lg bg-zinc-950 p-3"
                    >
                      <p className="text-xs text-zinc-500">
                        {formatDate(item.date)}
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="text-sky-400">{item.opened}</span>
                        {" abertos · "}
                        <span className="text-emerald-400">
                          {item.resolved}
                        </span>
                        {" resolvidos"}
                      </p>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-500">
              Não há dados para o período selecionado.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
          <h2 className="font-semibold">Categorias mais frequentes</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Chamados abertos no período.
          </p>

          <div className="mt-5 space-y-5">
            {categoryStats.slice(0, 8).map((item) => {
              const max = Math.max(
                1,
                ...categoryStats.map((category) => category.value),
              );

              return (
                <div key={item.name}>
                  <div className="mb-2 flex justify-between gap-3 text-sm">
                    <span className="truncate text-zinc-300">{item.name}</span>
                    <span className="text-zinc-400">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{
                        width: `${(item.value / max) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {categoryStats.length === 0 && (
              <p className="text-sm text-zinc-500">
                Nenhuma categoria encontrada neste período.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
        <div className="flex flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Chamados do período</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {current.length} chamado(s) relacionado(s) ao intervalo.
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
          >
            Exportar tabela
          </button>
        </div>

        <div className="overflow-x-auto">
          {current.length > 5 && (
            <div className="flex justify-center border-t border-white/10 p-4">
              <button
                type="button"
                onClick={() => setExpanded((previous) => !previous)}
                className="rounded-lg border border-white/10 px-5 py-2 text-sm font-medium text-sky-300 transition hover:border-sky-500 hover:bg-sky-500/10"
              >
                {expanded
                  ? "Mostrar menos"
                  : `Expandir (${current.length - 5} restantes)`}
              </button>
            </div>
          )}
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-5 py-3 font-medium">Chamado</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Prioridade</th>
                <th className="px-5 py-3 font-medium">Status atual</th>
                <th className="px-5 py-3 font-medium">Abertura</th>
                <th className="px-5 py-3 font-medium">Resolução</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[...current]
                .sort((a, b) => {
                  const dateA = parseDate(a.createdAt)?.getTime() ?? 0;
                  const dateB = parseDate(b.createdAt)?.getTime() ?? 0;
                  return dateB - dateA;
                })
                .slice(0, expanded ? current.length : 5)
                .map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="transition hover:bg-white/[0.03]"
                  >
                    <td className="max-w-[260px] px-5 py-4">
                      <p className="truncate font-medium">
                        {ticket.title || "Sem título"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {ticket.category || "Não informada"}
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {priorityLabel(ticket.priority)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          ticket.status === "closed"
                            ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400"
                            : "rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400"
                        }
                      >
                        {statusLabel(ticket.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-zinc-400">
                      {ticket.createdAt
                        ? formatDate(new Date(ticket.createdAt))
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-zinc-400">
                      {ticket.resolvedAt
                        ? formatDate(new Date(ticket.resolvedAt))
                        : "—"}
                    </td>
                  </tr>
                ))}

              {current.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-zinc-500"
                  >
                    Nenhum chamado encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {current.length > 100 && (
          <p className="border-t border-white/10 px-5 py-3 text-xs text-zinc-500">
            A tabela exibe os 100 chamados mais recentes. O CSV inclui todos os
            chamados do período.
          </p>
        )}
      </section>
    </main>
  );
}
