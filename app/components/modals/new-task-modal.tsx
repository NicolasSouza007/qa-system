"use client";
import { useState } from "react";
import { FiX } from "react-icons/fi";

type ColumnDef = { key: string; label: string };
type User = { id: string; name: string; photo: string; role: string };

const emptyForm = {
  title: "",
  priority: "medium" as "high" | "medium" | "low",
  module: "",
  column: "today",
  assignedTo: "",
};

export function NewTaskModal({
  workspaceId,
  columns,
  members,
  onClose,
}: {
  workspaceId: string;
  columns: ColumnDef[];
  members: User[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    ...emptyForm,
    column: columns[0]?.key ?? "today",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title.trim() || !form.module.trim() || !form.assignedTo) return;
    setSaving(true);

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, workspaceId }),
    });

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Nova task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white duration-200"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-gray-200 text-xs mb-1 block">Título</label>
            <input
              type="text"
              placeholder="Ex: Testar fluxo de login"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-gray-200 text-xs mb-1 block">Módulo</label>
            <input
              type="text"
              placeholder="Ex: Auth, Relatórios..."
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
                  {p === "high" ? "Alta" : p === "medium" ? "Média" : "Baixa"}
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
              onChange={(e) => setForm({ ...form, column: e.target.value })}
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
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setForm({ ...form, assignedTo: member.id })}
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
                    {form.assignedTo === member.id && (
                      <span className="ml-auto text-sky-400 text-xs">✓</span>
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
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed duration-200 text-white font-medium py-2.5 rounded-lg text-sm"
          >
            {saving ? "Salvando..." : "Criar task"}
          </button>
        </div>
      </div>
    </div>
  );
}
