"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { FiPlus, FiX, FiUserPlus, FiCheck } from "react-icons/fi";
import { useSession } from "next-auth/react";
import { TaskModal } from "@/app/components/task-modal";
import { KanbanBoard } from "./kanban-board";
import type { Task } from "@/app/types/Task";

type User = {
  id: string;
  name: string;
  photo: string;
  role: string;
};

const emptyForm = {
  title: "",
  priority: "medium" as Task["priority"],
  module: "",
  column: "today" as Task["column"],
  assignedTo: "",
};

const columns = [
  { key: "today", label: "Testes de hoje", color: "text-sky-300" },
  { key: "bugs", label: "Bugs", color: "text-red-400" },
  { key: "review", label: "Revisão", color: "text-yellow-400" },
  { key: "approved", label: "Aprovado", color: "text-green-400" },
];

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: session } = useSession();

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, "tasks"), (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User));
    });
    return () => {
      unsubTasks();
      unsubUsers();
    };
  }, []);

  const members = users.filter((u) => u.role === "member");

  async function handleSave() {
    if (!form.title.trim() || !form.module.trim() || !form.assignedTo) return;
    setSaving(true);
    await addDoc(collection(db, "tasks"), {
      ...form,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setSaving(false);
    setForm(emptyForm);
    setModalOpen(false);
  }

  async function handleInvite() {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    setInviteStatus("sending");
    setInviteError("");

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });

    const data = await res.json();

    if (!res.ok) {
      setInviteError(data.error ?? "Erro ao enviar convite");
      setInviteStatus("error");
      return;
    }

    setInviteStatus("sent");
  }

  function handleCloseInviteModal() {
    setInviteModal(false);
    setInviteStatus("idle");
    setInviteError("");
    setInviteForm({ name: "", email: "" });
  }

  return (
    <div>
      {/* Resumo por membro */}
      {members.length > 0 && (
        <div className="mb-8">
          <h3 className="text-gray-200 text-sm font-medium mb-4">
            Progresso do time
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {members.map((member) => {
              const memberTasks = tasks.filter(
                (t) => t.assignedTo === member.id,
              );
              const approved = memberTasks.filter(
                (t) => t.column === "approved",
              ).length;
              const pct =
                memberTasks.length > 0
                  ? Math.round((approved / memberTasks.length) * 100)
                  : 0;

              return (
                <div
                  key={member.id}
                  className="bg-gray-900 border border-gray-500 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="text-white text-sm font-medium">
                        {member.name.split(" ")[0]}
                      </p>
                      <p className="text-gray-200 text-xs">
                        {memberTasks.length} tasks
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {columns.map((col) => (
                      <div key={col.key} className="text-center">
                        <p className="text-white text-sm font-medium">
                          {
                            memberTasks.filter((t) => t.column === col.key)
                              .length
                          }
                        </p>
                        <p className="text-gray-200 text-xs">
                          {col.label.split(" ")[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-gray-200 text-xs mt-1">{pct}% concluído</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Header do board */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-200 text-sm font-medium">Board geral</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 duration-200 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <FiPlus size={16} />
            Nova task
          </button>
          <button
            onClick={() => setInviteModal(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 duration-200 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <FiUserPlus size={16} />
            Convidar membro
          </button>
        </div>
      </div>

      {/* Board Kanban */}
      <KanbanBoard
        tasks={tasks}
        users={users}
        setTasks={setTasks}
        onOpenTask={setSelectedTask}
      />

      {/* Modal Nova Task */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-200 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">Nova task</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white duration-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-gray-200 text-xs mb-1 block">
                  Título
                </label>
                <input
                  type="text"
                  placeholder="Ex: Testar fluxo de login"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-gray-200 text-xs mb-1 block">
                  Módulo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Auth, Relatórios, Usuário..."
                  value={form.module}
                  onChange={(e) => setForm({ ...form, module: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-gray-200 text-xs mb-1 block">
                  Prioridade
                </label>
                <div className="flex gap-2">
                  {(["high", "medium", "low"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border duration-200 ${
                        form.priority === p
                          ? p === "high"
                            ? "bg-red-500/20 border-red-500 text-red-400"
                            : p === "medium"
                              ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                              : "bg-green-500/20 border-green-500 text-green-400"
                          : "bg-gray-800 border-gray-700 text-gray-400"
                      }`}
                    >
                      {p === "high"
                        ? "Alta"
                        : p === "medium"
                          ? "Média"
                          : "Baixa"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-200 text-xs mb-1 block">
                  Coluna inicial
                </label>
                <select
                  value={form.column}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      column: e.target.value as Task["column"],
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  {columns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-200 text-xs mb-1 block">
                  Atribuir para
                </label>
                {members.length === 0 ? (
                  <p className="text-gray-400 text-xs">
                    Nenhum membro cadastrado ainda.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() =>
                          setForm({ ...form, assignedTo: member.id })
                        }
                        className={`flex items-center gap-3 p-2 rounded-lg border duration-200 ${
                          form.assignedTo === member.id
                            ? "border-sky-500 bg-sky-500/10"
                            : "border-gray-700 bg-gray-800 hover:border-gray-600"
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
                        {form.assignedTo === member.id && (
                          <span className="ml-auto text-sky-400 text-xs">
                            ✓ selecionado
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.title.trim() ||
                  !form.module.trim() ||
                  !form.assignedTo
                }
                className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed duration-200 text-white font-medium py-2.5 rounded-lg text-sm mt-2"
              >
                {saving ? "Salvando..." : "Criar task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Convidar Membro */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">
                Convidar membro
              </h2>
              <button
                onClick={handleCloseInviteModal}
                className="text-gray-400 hover:text-white duration-200"
              >
                <FiX size={20} />
              </button>
            </div>

            {inviteStatus === "sent" ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheck size={24} className="text-green-400" />
                </div>
                <p className="text-white font-medium mb-1">Convite enviado!</p>
                <p className="text-gray-400 text-sm">
                  Um e-mail foi enviado para{" "}
                  <span className="text-white">{inviteForm.email}</span>
                </p>
                <button
                  onClick={handleCloseInviteModal}
                  className="mt-6 text-sky-400 hover:text-sky-300 text-sm duration-200"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-gray-200 text-xs mb-1 block">
                    Nome
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={inviteForm.name}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, name: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-gray-200 text-xs mb-1 block">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: joao@gmail.com"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {inviteStatus === "error" && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{inviteError}</p>
                  </div>
                )}

                <button
                  onClick={handleInvite}
                  disabled={
                    inviteStatus === "sending" ||
                    !inviteForm.name.trim() ||
                    !inviteForm.email.trim()
                  }
                  className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed duration-200 text-white font-medium py-2.5 rounded-lg text-sm mt-2"
                >
                  {inviteStatus === "sending"
                    ? "Enviando..."
                    : "Enviar convite por e-mail"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de detalhes da task */}
      {selectedTask && session?.user && (
        <TaskModal
          task={selectedTask}
          currentUser={{
            id: session.user.id,
            name: session.user.name ?? "Admin",
            photo: session.user.image ?? "",
          }}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
