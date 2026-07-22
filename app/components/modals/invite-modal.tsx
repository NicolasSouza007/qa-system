"use client";
import { useState } from "react";
import { FiX, FiCheck } from "react-icons/fi";

export function InviteModal({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", role: "member" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function handleInvite() {
    if (!form.name.trim() || !form.email.trim()) return;
    setStatus("sending");
    setError("");

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, workspaceId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao enviar convite");
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  function handleClose() {
    setStatus("idle");
    setError("");
    setForm({ name: "", email: "", role: "member" });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Convidar membro</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white duration-200"
          >
            <FiX size={20} />
          </button>
        </div>

        {status === "sent" ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck size={24} className="text-green-400" />
            </div>
            <p className="text-white font-medium mb-1">Convite enviado!</p>
            <p className="text-gray-400 text-sm">
              Um e-mail foi enviado para{" "}
              <span className="text-white">{form.email}</span>
            </p>
            <button onClick={handleClose} className="mt-6 text-sky-400 text-sm">
              Fechar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-gray-200 text-xs mb-1 block">Nome</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-gray-200 text-xs mb-1 block">E-mail</label>
              <input
                type="email"
                placeholder="Ex: joao@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-gray-200 text-xs mb-1 block">Função</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setForm({ ...form, role: "member" })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border duration-200 ${form.role === "member" ? "bg-sky-500/20 border-sky-500 text-sky-400" : "bg-gray-800 border-gray-700 text-gray-400"}`}
                >
                  Membro
                </button>
                <button
                  onClick={() => setForm({ ...form, role: "admin" })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border duration-200 ${form.role === "admin" ? "bg-purple-500/20 border-purple-500 text-purple-400" : "bg-gray-800 border-gray-700 text-gray-400"}`}
                >
                  Admin
                </button>
              </div>
            </div>
            {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={handleInvite}
              disabled={
                status === "sending" || !form.name.trim() || !form.email.trim()
              }
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed duration-200 text-white font-medium py-2.5 rounded-lg text-sm mt-2"
            >
              {status === "sending"
                ? "Enviando..."
                : "Enviar convite por e-mail"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
