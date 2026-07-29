"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import {
  FiPlus,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiUser,
} from "react-icons/fi";

type Ticket = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
  status: "open" | "closed";
  assignedTo: string;
  createdBy: string;
  createdByName: string;
  createdByPhoto: string;
  workspaceId: string;
  clientId?: string;
  clientName?: string;
  createdAt: any;
  updatedAt: any;
};

type Member = {
  id: string;
  name: string;
  photo: string;
  role: string;
};

type Cliente = {
  id: string;
  name: string;
  company: string;
};

const priorityConfig = {
  high: {
    label: "Alta",
    color: "text-red-400 bg-red-500/10 border-red-500/30",
    dot: "bg-red-500",
  },
  medium: {
    label: "Média",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Baixa",
    color: "text-green-400 bg-green-500/10 border-green-500/30",
    dot: "bg-green-500",
  },
};

const categories = [
  "Bug",
  "Melhoria",
  "Dúvida",
  "Infraestrutura",
  "Segurança",
  "Outro",
];

const emptyForm = {
  title: "",
  description: "",
  priority: "medium" as Ticket["priority"],
  category: "Bug",
  assignedTo: "",
  clientId: "",
  clientName: "",
};

export function TicketsClient({
  workspaceId,
  userId,
  userName,
  userPhoto,
  role,
}: {
  workspaceId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  role: string;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "closed">(
    "all",
  );
  const [filterPriority, setFilterPriority] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "tickets"),
      where("workspaceId", "==", workspaceId),
      orderBy("createdAt", "desc"),
    );
    const unsubTickets = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ticket));
    });

    const unsubMembers = onSnapshot(
      collection(db, "workspaceMembers", workspaceId, "members"),
      async (snap) => {
        const data: Member[] = [];
        for (const d of snap.docs) {
          const uSnap = await import("firebase/firestore").then(
            ({ getDoc, doc: fDoc }) => getDoc(fDoc(db, "users", d.id)),
          );
          if (uSnap.exists())
            data.push({
              id: d.id,
              role: d.data().role,
              ...uSnap.data(),
            } as Member);
        }
        setMembers(data);
      },
    );

    const unsubClientes = onSnapshot(
      query(
        collection(db, "clientes"),
        where("workspaceId", "==", workspaceId),
      ),
      (snap) => {
        setClientes(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name,
            company: d.data().company ?? "",
          })),
        );
      },
    );

    return () => {
      unsubTickets();
      unsubMembers();
      unsubClientes();
    };
  }, [workspaceId, userId, role]);

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);

    const assignedTo =
      role === "admin" && form.assignedTo ? form.assignedTo : userId;

    await addDoc(collection(db, "tickets"), {
      title: form.title,
      description: form.description,
      priority: form.priority,
      category: form.category,
      assignedTo,
      clientId: form.clientId || null,
      clientName: form.clientName || null,
      status: "open",
      workspaceId,
      createdBy: userId,
      createdByName: userName,
      createdByPhoto: userPhoto,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (assignedTo !== userId) {
      await addDoc(collection(db, "notifications"), {
        userId: assignedTo,
        workspaceId,
        taskId: "",
        taskTitle: form.title,
        message: `${userName} abriu um ticket para você: "${form.title}"`,
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    setSaving(false);
    setForm(emptyForm);
    setClientSearch("");
    setModalOpen(false);
  }

  async function handleToggleStatus(ticket: Ticket) {
    await updateDoc(doc(db, "tickets", ticket.id), {
      status: ticket.status === "open" ? "closed" : "open",
      updatedAt: serverTimestamp(),
    });
  }

  function formatTime(timestamp: any) {
    if (!timestamp) return "";
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filtered = tickets.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const filteredClientes = clientes.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.company.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  const openCount = tickets.filter((t) => t.status === "open").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  return (
    <div>
      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Total</p>
          <p className="text-white text-2xl font-bold">{tickets.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-yellow-400 text-xs mb-1">Abertos</p>
          <p className="text-white text-2xl font-bold">{openCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-green-400 text-xs mb-1">Fechados</p>
          <p className="text-white text-2xl font-bold">{closedCount}</p>
        </div>
      </div>

      {/* Filtros e botão */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <FiFilter size={14} className="text-gray-400" />
          {(["all", "open", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border duration-200 ${
                filterStatus === s
                  ? "bg-sky-500/20 border-sky-500 text-sky-400"
                  : "bg-gray-900 border-gray-700 text-gray-400"
              }`}
            >
              {s === "all" ? "Todos" : s === "open" ? "Abertos" : "Fechados"}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-700" />
          {(["all", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border duration-200 ${
                filterPriority === p
                  ? "bg-sky-500/20 border-sky-500 text-sky-400"
                  : "bg-gray-900 border-gray-700 text-gray-400"
              }`}
            >
              {p === "all"
                ? "Todas"
                : p === "high"
                  ? "Alta"
                  : p === "medium"
                    ? "Média"
                    : "Baixa"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 duration-200 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
        >
          <FiPlus size={16} /> Novo ticket
        </button>
      </div>

      {/* Lista de tickets */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FiAlertTriangle size={32} className="text-gray-600" />
          <p className="text-gray-500 text-sm">Nenhum ticket encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((ticket) => {
            const priority = priorityConfig[ticket.priority];
            const assignee = members.find((m) => m.id === ticket.assignedTo);
            const isOpen = ticket.status === "open";
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-xl p-4 cursor-pointer duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                          isOpen
                            ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                            : "text-green-400 bg-green-500/10 border-green-500/30"
                        }`}
                      >
                        {isOpen ? (
                          <FiClock size={10} />
                        ) : (
                          <FiCheckCircle size={10} />
                        )}
                        {isOpen ? "Aberto" : "Fechado"}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priority.color}`}
                      >
                        {priority.label}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
                        {ticket.category}
                      </span>
                    </div>
                    <h3 className="text-white font-medium text-sm mb-1 truncate">
                      {ticket.title}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-2">
                      {ticket.description}
                    </p>
                    {ticket.clientName && (
                      <p className="text-gray-500 text-xs flex items-center gap-1 mt-1.5">
                        <FiUser size={10} /> {ticket.clientName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {assignee && (
                      <img
                        src={assignee.photo}
                        alt={assignee.name}
                        className="w-7 h-7 rounded-full"
                      />
                    )}
                    <p className="text-gray-600 text-xs whitespace-nowrap">
                      {formatTime(ticket.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal novo ticket */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-white font-semibold text-lg">Novo ticket</h2>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setForm(emptyForm);
                  setClientSearch("");
                }}
                className="text-gray-400 hover:text-white duration-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Cliente */}
              <div>
                <label className="text-gray-300 text-xs mb-1 block">
                  Cliente
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar cliente..."
                    value={form.clientId ? form.clientName : clientSearch}
                    onChange={(e) => {
                      if (form.clientId)
                        setForm({ ...form, clientId: "", clientName: "" });
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() =>
                      setTimeout(() => setShowClientDropdown(false), 200)
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                  {form.clientId && (
                    <button
                      onClick={() =>
                        setForm({ ...form, clientId: "", clientName: "" })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <FiX size={14} />
                    </button>
                  )}
                  {showClientDropdown && !form.clientId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-20 max-h-40 overflow-y-auto shadow-xl">
                      {filteredClientes.length === 0 ? (
                        <p className="text-gray-500 text-xs px-3 py-2">
                          Nenhum cliente encontrado
                        </p>
                      ) : (
                        filteredClientes.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setForm({
                                ...form,
                                clientId: c.id,
                                clientName: c.name,
                              });
                              setShowClientDropdown(false);
                              setClientSearch("");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 duration-200 text-left"
                          >
                            <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
                              <span className="text-sky-400 text-xs font-semibold">
                                {c.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-white text-xs font-medium">
                                {c.name}
                              </p>
                              {c.company && (
                                <p className="text-gray-500 text-xs">
                                  {c.company}
                                </p>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="text-gray-300 text-xs mb-1 block">
                  Assunto / Título
                </label>
                <input
                  type="text"
                  placeholder="Descreva o problema brevemente..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-gray-300 text-xs mb-1 block">
                  Mensagem / Descrição
                </label>
                <textarea
                  placeholder="Descreva o problema com detalhes, passos para reproduzir, etc..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Prioridade e Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs mb-1 block">
                    Prioridade
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {(["high", "medium", "low"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setForm({ ...form, priority: p })}
                        className={`py-1.5 rounded-lg text-xs font-medium border duration-200 ${
                          form.priority === p
                            ? priorityConfig[p].color
                            : "bg-gray-800 border-gray-700 text-gray-400"
                        }`}
                      >
                        {priorityConfig[p].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-gray-300 text-xs mb-1 block">
                    Categoria
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setForm({ ...form, category: cat })}
                        className={`py-1.5 rounded-lg text-xs font-medium border duration-200 ${
                          form.category === cat
                            ? "bg-sky-500/20 border-sky-500 text-sky-400"
                            : "bg-gray-800 border-gray-700 text-gray-400"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Atribuir para — só admin vê */}
              {role === "admin" && members.length > 0 && (
                <div>
                  <label className="text-gray-300 text-xs mb-1 block">
                    Atendente / Responsável
                  </label>
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                    {members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() =>
                          setForm({ ...form, assignedTo: member.id })
                        }
                        className={`flex items-center gap-3 p-2 rounded-lg border duration-200 ${
                          form.assignedTo === member.id
                            ? "border-sky-500 bg-sky-500/10"
                            : "border-gray-700 bg-gray-800"
                        }`}
                      >
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-7 h-7 rounded-full"
                        />
                        <span className="text-white text-sm">
                          {member.name.split(" ")[0]}
                        </span>
                        <span className="text-gray-500 text-xs ml-auto">
                          {member.role}
                        </span>
                        {form.assignedTo === member.id && (
                          <span className="text-sky-400 text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={
                  saving || !form.title.trim() || !form.description.trim()
                }
                className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed duration-200 text-white font-medium py-2.5 rounded-lg text-sm"
              >
                {saving ? "Criando..." : "Criar Chamado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe do ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                      selectedTicket.status === "open"
                        ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                        : "text-green-400 bg-green-500/10 border-green-500/30"
                    }`}
                  >
                    {selectedTicket.status === "open" ? (
                      <FiClock size={10} />
                    ) : (
                      <FiCheckCircle size={10} />
                    )}
                    {selectedTicket.status === "open" ? "Aberto" : "Fechado"}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priorityConfig[selectedTicket.priority].color}`}
                  >
                    {priorityConfig[selectedTicket.priority].label}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
                    {selectedTicket.category}
                  </span>
                </div>
                <h2 className="text-white font-semibold text-base">
                  {selectedTicket.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-white duration-200 shrink-0"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Descrição</p>
                <p className="text-gray-200 text-sm leading-relaxed bg-gray-800 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedTicket.clientName && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Cliente</p>
                    <p className="text-white text-sm flex items-center gap-1">
                      <FiUser size={12} className="text-gray-400" />{" "}
                      {selectedTicket.clientName}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 text-xs mb-1">Criado por</p>
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedTicket.createdByPhoto}
                      alt={selectedTicket.createdByName}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-white text-sm">
                      {selectedTicket.createdByName.split(" ")[0]}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Responsável</p>
                  {(() => {
                    const assignee = members.find(
                      (m) => m.id === selectedTicket.assignedTo,
                    );
                    return assignee ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={assignee.photo}
                          alt={assignee.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-white text-sm">
                          {assignee.name.split(" ")[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">—</span>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Criado em</p>
                  <p className="text-gray-300 text-sm">
                    {formatTime(selectedTicket.createdAt)}
                  </p>
                </div>
              </div>

              {(role === "admin" || selectedTicket.createdBy === userId) && (
                <button
                  onClick={() => {
                    handleToggleStatus(selectedTicket);
                    setSelectedTicket(null);
                  }}
                  className={`w-full font-medium py-2.5 rounded-lg text-sm duration-200 ${
                    selectedTicket.status === "open"
                      ? "bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400"
                      : "bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400"
                  }`}
                >
                  {selectedTicket.status === "open"
                    ? "✓ Marcar como Resolvido"
                    : "↩ Reabrir ticket"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
