"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  FiPlus,
  FiX,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiUpload,
  FiCheck,
  FiAlertCircle,
  FiDownload,
} from "react-icons/fi";
import { DeleteConfirmModal } from "@/app/components/modals/delete-confirm-modal";
import * as XLSX from "xlsx";

type Cliente = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  document: string; // CNPJ/CPF
  workspaceId: string;
  createdAt: any;
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  document: "",
};

export function ClientesClient({ workspaceId }: { workspaceId: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<
    { line: number; reason: string }[]
  >([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "clientes"),
      where("workspaceId", "==", workspaceId),
      orderBy("name", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Cliente));
    });
    return () => unsub();
  }, [workspaceId]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(cliente: Cliente) {
    setEditing(cliente);
    setForm({
      name: cliente.name,
      email: cliente.email,
      phone: cliente.phone,
      company: cliente.company,
      address: cliente.address,
      document: cliente.document,
    });
    setModalOpen(true);
    setSelectedCliente(null);
  }

  async function handleSave() {
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.company.trim() ||
      !form.document.trim()
    ) {
      return;
    }
    setSaving(true);

    if (editing) {
      await updateDoc(doc(db, "clientes", editing.id), {
        ...form,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "clientes"), {
        ...form,
        workspaceId,
        createdAt: serverTimestamp(),
      });
    }

    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    setEditing(null);
  }

  async function handleDelete() {
    if (!toDelete) return;
    await deleteDoc(doc(db, "clientes", toDelete.id));
    setToDelete(null);
    setSelectedCliente(null);
  }

  const filtered = clientes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.document.toLowerCase().includes(search.toLowerCase()),
  );

  function openImport() {
    setImportPreview([]);
    setImportErrors([]);
    setImportResult(null);
    setImportModalOpen(true);
  }

  async function handleExcelFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        throw new Error("A planilha não possui nenhuma aba válida.");
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: false,
      }) as Record<string, unknown>[];

      const mapped = rows.map((row) => {
        const normalized: Record<string, string> = {};

        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = key
            .toString()
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          normalized[normalizedKey] = String(value ?? "").trim();
        });

        return {
          name: normalized.nome ?? normalized.name ?? "",

          email: normalized.email ?? normalized["e-mail"] ?? "",

          phone: normalized.telefone ?? normalized.phone ?? "",

          company: normalized.empresa ?? normalized.company ?? "",

          address: normalized.endereco ?? normalized.address ?? "",

          document:
            normalized.documento ??
            normalized["cnpj / cpf"] ??
            normalized["cnpj/cpf"] ??
            normalized["cpf/cnpj"] ??
            normalized.cnpj ??
            normalized.cpf ??
            normalized.document ??
            "",
        };
      });

      setImportPreview(mapped);
    } catch (error) {
      console.error(error);

      alert(
        "Não foi possível ler a planilha. Verifique se o arquivo é um Excel válido.",
      );
    }

    event.target.value = "";
  }

  async function handleImportConfirm() {
    if (importPreview.length === 0) return;

    setImporting(true);

    try {
      const response = await fetch("/api/clientes/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientes: importPreview,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao importar clientes.");
      }

      setImportErrors(data.errors ?? []);

      setImportResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
      });
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error ? error.message : "Erro ao importar clientes.",
      );
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const data = [
      {
        Nome: "João Silva",
        "E-mail": "joao@email.com",
        Telefone: "(11) 99999-9999",
        Empresa: "Empresa ABC",
        "CNPJ / CPF": "12.345.678/0001-90",
        Endereço: "Rua Exemplo, 100 - São Paulo/SP",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    XLSX.writeFile(workbook, "modelo-clientes.xlsx");
  }

  return (
    <div>
      {/* Header com busca e botão */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <FiSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={openImport}
            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap duration-200"
          >
            <FiUpload size={16} />
            Importar
          </button>

          <button
            onClick={openNew}
            className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 duration-200 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
          >
            <FiPlus size={16} />
            Novo cliente
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-gray-400 text-xs mb-1">Total de clientes</p>
          <p className="text-white text-2xl font-bold">{clientes.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Com empresa</p>
          <p className="text-white text-2xl font-bold">
            {clientes.filter((c) => c.company).length}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Resultado busca</p>
          <p className="text-white text-2xl font-bold">{filtered.length}</p>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FiUser size={32} className="text-gray-600" />
          <p className="text-gray-500 text-sm">
            {search
              ? "Nenhum cliente encontrado"
              : "Nenhum cliente cadastrado ainda"}
          </p>
          {!search && (
            <button
              onClick={openNew}
              className="text-sky-400 text-sm hover:text-sky-300 duration-200"
            >
              Cadastrar primeiro cliente →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => setSelectedCliente(cliente)}
              className="bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-xl p-4 cursor-pointer duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sky-400 font-semibold text-sm">
                    {cliente.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(cliente);
                    }}
                    className="p-1.5 text-gray-500 hover:text-sky-400 duration-200"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setToDelete(cliente);
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 duration-200"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="text-white font-medium text-sm mb-1 truncate">
                {cliente.name}
              </h3>
              {cliente.company && (
                <p className="text-gray-400 text-xs mb-2 truncate flex items-center gap-1">
                  <FiBriefcase size={11} /> {cliente.company}
                </p>
              )}
              {cliente.email && (
                <p className="text-gray-500 text-xs truncate flex items-center gap-1">
                  <FiMail size={11} /> {cliente.email}
                </p>
              )}
              {cliente.phone && (
                <p className="text-gray-500 text-xs truncate flex items-center gap-1 mt-0.5">
                  <FiPhone size={11} /> {cliente.phone}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-white font-semibold text-lg">
                {editing ? "Editar cliente" : "Novo cliente"}
              </h2>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
                className="text-gray-400 hover:text-white duration-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-gray-300 text-xs mb-1 block">
                    Nome *
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs mb-1 block">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs mb-1 block">
                    Telefone *
                  </label>

                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs mb-1 block">
                    Empresa *
                  </label>

                  <input
                    type="text"
                    placeholder="Nome da empresa"
                    value={form.company}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        company: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs mb-1 block">
                    CNPJ / CPF *
                  </label>

                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={form.document}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        document: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-gray-300 text-xs mb-1 block">
                    Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro, cidade - UF"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setEditing(null);
                  }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-lg duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !form.name.trim() ||
                    !form.phone.trim() ||
                    !form.company.trim() ||
                    !form.document.trim()
                  }
                  className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed duration-200 text-white font-medium py-2.5 rounded-lg text-sm"
                >
                  {saving
                    ? "Salvando..."
                    : editing
                      ? "Salvar alterações"
                      : "Cadastrar cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe do cliente */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                  <span className="text-sky-400 font-semibold">
                    {selectedCliente.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-white font-semibold">
                    {selectedCliente.name}
                  </h2>
                  {selectedCliente.company && (
                    <p className="text-gray-400 text-xs">
                      {selectedCliente.company}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
                className="text-gray-400 hover:text-white duration-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              {selectedCliente.email && (
                <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <FiMail size={16} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">E-mail</p>
                    <p className="text-white text-sm">
                      {selectedCliente.email}
                    </p>
                  </div>
                </div>
              )}
              {selectedCliente.phone && (
                <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <FiPhone size={16} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Telefone</p>
                    <p className="text-white text-sm">
                      {selectedCliente.phone}
                    </p>
                  </div>
                </div>
              )}
              {selectedCliente.document && (
                <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <FiBriefcase size={16} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">CNPJ / CPF</p>
                    <p className="text-white text-sm">
                      {selectedCliente.document}
                    </p>
                  </div>
                </div>
              )}
              {selectedCliente.address && (
                <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <FiMapPin size={16} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Endereço</p>
                    <p className="text-white text-sm">
                      {selectedCliente.address}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => openEdit(selectedCliente)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg duration-200"
                >
                  <FiEdit2 size={14} /> Editar
                </button>
                <button
                  onClick={() => setToDelete(selectedCliente)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium py-2.5 rounded-lg duration-200"
                >
                  <FiTrash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação exclusão */}
      {toDelete && (
        <DeleteConfirmModal
          title="Excluir cliente?"
          description={toDelete.name}
          warning="O cliente será removido permanentemente. Os tickets vinculados a ele não serão apagados."
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
      {/* Modal de importação */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <div>
                <h2 className="text-white font-semibold text-lg">
                  Importar clientes
                </h2>

                <p className="text-gray-500 text-xs mt-1">
                  Importe vários clientes através de uma planilha Excel.
                </p>
              </div>

              <button
                onClick={() => setImportModalOpen(false)}
                className="text-gray-400 hover:text-white duration-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-5">
              {/* Instruções */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <FiAlertCircle
                    size={18}
                    className="text-sky-400 mt-0.5 shrink-0"
                  />

                  <div>
                    <p className="text-gray-300 text-sm font-medium">
                      Como importar?
                    </p>

                    <p className="text-gray-500 text-xs mt-1">
                      Prepare uma planilha Excel (.xlsx) com os dados dos
                      clientes e selecione o arquivo abaixo.
                    </p>

                    <p className="text-gray-500 text-xs mt-2">
                      Os campos obrigatórios são:{" "}
                      <strong className="text-gray-300">
                        Nome, Telefone, Empresa e CNPJ/CPF
                      </strong>
                      . E-mail e Endereço são opcionais.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modelo */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-800/50 border border-gray-800 rounded-xl p-4 mb-5">
                <div>
                  <p className="text-gray-300 text-sm font-medium">
                    Ainda não possui uma planilha?
                  </p>

                  <p className="text-gray-500 text-xs mt-1">
                    Baixe nosso modelo e preencha os dados.
                  </p>
                </div>

                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-medium duration-200"
                >
                  <FiDownload size={15} />
                  Baixar modelo
                </button>
              </div>

              {/* Selecionar arquivo */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 hover:border-sky-500 rounded-xl p-8 cursor-pointer duration-200">
                <FiUpload size={30} className="text-gray-500 mb-3" />

                <p className="text-gray-300 text-sm font-medium">
                  Clique para selecionar a planilha
                </p>

                <p className="text-gray-600 text-xs mt-1">
                  Apenas arquivos .xlsx
                </p>

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFile}
                  className="hidden"
                />
              </label>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white text-sm font-semibold">
                        Pré-visualização
                      </h3>

                      <p className="text-gray-500 text-xs mt-1">
                        {importPreview.length} registro(s) encontrado(s).
                      </p>
                    </div>

                    <span className="text-xs text-gray-500">
                      Confira antes de importar
                    </span>
                  </div>

                  <div className="border border-gray-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-800 sticky top-0">
                          <tr>
                            <th className="px-3 py-3 text-gray-400 font-medium text-xs">
                              Nome
                            </th>

                            <th className="px-3 py-3 text-gray-400 font-medium text-xs">
                              Telefone
                            </th>

                            <th className="px-3 py-3 text-gray-400 font-medium text-xs">
                              Empresa
                            </th>

                            <th className="px-3 py-3 text-gray-400 font-medium text-xs">
                              CNPJ / CPF
                            </th>

                            <th className="px-3 py-3 text-gray-400 font-medium text-xs">
                              E-mail
                            </th>

                            <th className="px-3 py-3 text-gray-400 font-medium text-xs">
                              Endereço
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {importPreview.slice(0, 100).map((cliente, index) => (
                            <tr
                              key={index}
                              className="border-t border-gray-800"
                            >
                              <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                                {String(cliente.name || "")}
                              </td>

                              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                {String(cliente.phone || "")}
                              </td>

                              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                {String(cliente.company || "")}
                              </td>

                              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                {String(cliente.document || "")}
                              </td>

                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {String(cliente.email || "")}
                              </td>

                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {String(cliente.address || "")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {importPreview.length > 100 && (
                      <div className="px-3 py-2 border-t border-gray-800 bg-gray-900">
                        <p className="text-gray-600 text-xs">
                          Mostrando os primeiros 100 registros de{" "}
                          {importPreview.length}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resultado */}
              {importResult && (
                <div className="mt-5 bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FiCheck size={18} className="text-green-400 mt-0.5" />

                    <div>
                      <p className="text-gray-200 text-sm font-medium">
                        Importação concluída
                      </p>

                      <p className="text-gray-500 text-xs mt-1">
                        {importResult.imported} cliente(s) importado(s).
                      </p>

                      {importResult.skipped > 0 && (
                        <p className="text-yellow-500 text-xs mt-1">
                          {importResult.skipped} registro(s) ignorado(s).
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Erros */}
              {importErrors.length > 0 && (
                <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FiAlertCircle size={16} className="text-red-400" />

                    <p className="text-red-400 text-sm font-medium">
                      Registros não importados
                    </p>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importErrors.map((error, index) => (
                      <p key={index} className="text-gray-500 text-xs">
                        Linha {error.line}: {error.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-800 sticky bottom-0 bg-gray-900">
              <button
                onClick={() => setImportModalOpen(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-lg duration-200"
              >
                Fechar
              </button>

              <button
                onClick={handleImportConfirm}
                disabled={
                  importing || importPreview.length === 0 || !!importResult
                }
                className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm duration-200"
              >
                {importing
                  ? "Importando..."
                  : importResult
                    ? "Importação concluída"
                    : `Importar ${importPreview.length} cliente(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
