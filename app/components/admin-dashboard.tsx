"use client";
import { useEffect, useRef, useState } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FiPlus,
  FiX,
  FiUserPlus,
  FiCheck,
  FiTrash2,
  FiEdit2,
} from "react-icons/fi";
import { useSession } from "next-auth/react";
import { TaskModal } from "@/app/components/task-modal";

type ColumnDef = { key: string; label: string };

type Task = {
  id: string;
  title: string;
  column: string;
  priority: "high" | "medium" | "low";
  module: string;
  assignedTo: string;
};

type User = {
  id: string;
  name: string;
  photo: string;
  role: string;
};

const defaultColumns: ColumnDef[] = [
  { key: "today", label: "Testes de hoje" },
  { key: "bugs", label: "Bugs" },
  { key: "review", label: "Revisão" },
  { key: "approved", label: "Aprovado" },
];

const emptyForm = {
  title: "",
  priority: "medium" as Task["priority"],
  module: "",
  column: "today",
  assignedTo: "",
};

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

function SortableCard({
  task,
  assignee,
  onOpen,
}: {
  task: Task;
  assignee?: User;
  onOpen: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { column: task.column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-800 rounded-lg p-3 mb-2 border border-gray-600 hover:border-gray-400 duration-200"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <p className="text-white text-sm font-medium mb-2">{task.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${priorityDot[task.priority]}`}
            />
            <span className="text-gray-400 text-xs">{task.module}</span>
          </div>
          <div className="flex items-center gap-2">
            {assignee && (
              <img
                src={assignee.photo}
                alt={assignee.name}
                className="w-5 h-5 rounded-full"
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen(task);
              }}
              className="text-white hover:text-gray-300 duration-200 text-sm px-2 py-0.5 rounded hover:bg-gray-900"
            >
              Ver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  col,
  tasks,
  members,
  onOpen,
  onRename,
  onRemove,
  isEditing,
  editingLabel,
  onEditingLabelChange,
  onEditBlur,
  onEditKeyDown,
  editInputRef,
}: {
  col: ColumnDef;
  tasks: Task[];
  members: User[];
  onOpen: (task: Task) => void;
  onRename: (col: ColumnDef) => void;
  onRemove: (key: string) => void;
  isEditing: boolean;
  editingLabel: string;
  onEditingLabelChange: (v: string) => void;
  onEditBlur: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { setNodeRef, isOver } = useSortable({
    id: col.key,
    data: { type: "column" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-68 bg-gray-900 rounded-xl border p-4 h-110 flex flex-col transition-colors duration-200 ${
        isOver ? "border-sky-500 bg-gray-800" : "border-gray-700"
      }`}
    >
      <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
        {isEditing ? (
          <input
            ref={editInputRef}
            value={editingLabel}
            onChange={(e) => onEditingLabelChange(e.target.value)}
            onBlur={onEditBlur}
            onKeyDown={onEditKeyDown}
            className="flex-1 bg-gray-800 border border-sky-500 rounded px-2 py-0.5 text-white text-sm focus:outline-none"
          />
        ) : (
          <span
            className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white duration-200 flex-1 truncate"
            onClick={() => onRename(col)}
            title="Clique para renomear"
          >
            {col.label}
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
          <button
            onClick={() => onRename(col)}
            className="text-gray-600 hover:text-gray-300 duration-200"
            title="Renomear"
          >
            <FiEdit2 size={12} />
          </button>
          <button
            onClick={() => onRemove(col.key)}
            className="text-gray-600 hover:text-red-400 duration-200"
            title="Remover coluna"
          >
            <FiTrash2 size={12} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 pr-1">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 && (
            <p className="text-gray-600 text-xs text-center mt-8">
              Nenhuma task
            </p>
          )}
          {tasks.map((task) => {
            const assignee = members.find((u) => u.id === task.assignedTo);
            return (
              <SortableCard
                key={task.id}
                task={task}
                assignee={assignee}
                onOpen={onOpen}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}

export function AdminDashboard({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: session } = useSession();

  const [editingColKey, setEditingColKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "member",
  });
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [inviteError, setInviteError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    const unsubTasks = onSnapshot(
      collection(db, "tasks", workspaceId, "tasks"),
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
      },
    );

    const unsubMembers = onSnapshot(
      collection(db, "workspaceMembers", workspaceId, "members"),
      async (snap) => {
        const memberIds = snap.docs.map((d) => ({
          id: d.id,
          role: d.data().role,
        }));
        const memberData: User[] = [];
        for (const m of memberIds) {
          if (m.id === userId) continue;
          const userSnap = await import("firebase/firestore").then(
            ({ getDoc, doc: fDoc }) => getDoc(fDoc(db, "users", m.id)),
          );
          if (userSnap.exists())
            memberData.push({
              id: m.id,
              role: m.role,
              ...userSnap.data(),
            } as User);
        }
        setMembers(memberData);
      },
    );

    const unsubWorkspace = onSnapshot(
      doc(db, "workspaces", workspaceId),
      (snap) => {
        const data = snap.data();
        if (data?.columns && Array.isArray(data.columns))
          setColumns(data.columns);
      },
    );

    return () => {
      unsubTasks();
      unsubMembers();
      unsubWorkspace();
    };
  }, [workspaceId, userId]);

  async function saveColumns(newCols: ColumnDef[]) {
    await updateDoc(doc(db, "workspaces", workspaceId), { columns: newCols });
  }

  function startEditing(col: ColumnDef) {
    setEditingColKey(col.key);
    setEditingLabel(col.label);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  async function handleRenameCol(key: string, newLabel: string) {
    if (!newLabel.trim()) return;
    const newCols = columns.map((c) =>
      c.key === key ? { ...c, label: newLabel.trim() } : c,
    );
    setColumns(newCols);
    await saveColumns(newCols);
    setEditingColKey(null);
  }

  async function handleAddCol() {
    if (!newColLabel.trim()) return;
    const key = `col_${Date.now()}`;
    const newCols = [...columns, { key, label: newColLabel.trim() }];
    setColumns(newCols);
    await saveColumns(newCols);
    setNewColLabel("");
    setAddingCol(false);
  }

  async function handleRemoveCol(key: string) {
    if (tasks.some((t) => t.column === key)) {
      alert("Não é possível remover uma coluna que possui tasks.");
      return;
    }
    if (!confirm("Remover esta coluna?")) return;
    const newCols = columns.filter((c) => c.key !== key);
    setColumns(newCols);
    await saveColumns(newCols);
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overColumn = columns.find((c) => c.key === overId);
    if (overColumn && activeTask.column !== overColumn.key) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, column: overColumn.key } : t,
        ),
      );
      return;
    }
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.column !== overTask.column) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, column: overTask.column } : t,
        ),
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;
    const overColumn = columns.find((c) => c.key === overId);
    const overTask = tasks.find((t) => t.id === overId);
    const targetColumn = overColumn?.key ?? overTask?.column ?? task.column;
    await updateDoc(doc(db, "tasks", workspaceId, "tasks", activeId), {
      column: targetColumn,
    });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.module.trim() || !form.assignedTo) return;
    setSaving(true);
    await addDoc(collection(db, "tasks", workspaceId, "tasks"), {
      ...form,
      workspaceId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setSaving(false);
    setForm(emptyForm);
    setModalOpen(false);
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remover este membro do workspace?")) return;
    await deleteDoc(
      doc(db, "workspaceMembers", workspaceId, "members", memberId),
    );
  }

  async function handleInvite() {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    setInviteStatus("sending");
    setInviteError("");
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...inviteForm, workspaceId }),
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
    setInviteForm({ name: "", email: "", role: "member" });
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
              return (
                <div
                  key={member.id}
                  className="bg-gray-900 border border-gray-500 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
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
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-gray-600 hover:text-red-400 duration-200"
                      title="Remover membro"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  {/* colunas dinâmicas — puxando os nomes reais */}
                  <div className="flex flex-wrap gap-2">
                    {columns.map((col) => (
                      <div
                        key={col.key}
                        className="flex-1 min-w-20 text-center bg-gray-800 rounded-lg py-2 px-1"
                      >
                        <p className="text-white text-sm font-semibold">
                          {
                            memberTasks.filter((t) => t.column === col.key)
                              .length
                          }
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {col.label.split(" ")[0]}
                        </p>
                      </div>
                    ))}
                  </div>
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
            <FiPlus size={16} /> Nova task
          </button>
          <button
            onClick={() => setInviteModal(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 duration-200 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <FiUserPlus size={16} /> Convidar membro
          </button>
        </div>
      </div>

      {/* Board Kanban com DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.column === col.key);
              return (
                <DroppableColumn
                  key={col.key}
                  col={col}
                  tasks={colTasks}
                  members={members}
                  onOpen={setSelectedTask}
                  onRename={startEditing}
                  onRemove={handleRemoveCol}
                  isEditing={editingColKey === col.key}
                  editingLabel={editingLabel}
                  onEditingLabelChange={setEditingLabel}
                  onEditBlur={() => handleRenameCol(col.key, editingLabel)}
                  onEditKeyDown={(e) => {
                    if (e.key === "Enter")
                      handleRenameCol(col.key, editingLabel);
                    if (e.key === "Escape") setEditingColKey(null);
                  }}
                  editInputRef={editInputRef}
                />
              );
            })}

            {/* Botão adicionar coluna */}
            <div className="w-72 shrink-0">
              {addingCol ? (
                <div className="bg-gray-900 rounded-xl border border-sky-500 p-4">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome da coluna..."
                    value={newColLabel}
                    onChange={(e) => setNewColLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCol();
                      if (e.key === "Escape") {
                        setAddingCol(false);
                        setNewColLabel("");
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCol}
                      className="flex-1 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium py-2 rounded-lg duration-200"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => {
                        setAddingCol(false);
                        setNewColLabel("");
                      }}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium py-2 rounded-lg duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  className="w-full h-20 bg-gray-900/50 hover:bg-gray-900 border border-dashed border-gray-700 hover:border-gray-500 rounded-xl text-gray-500 hover:text-gray-300 duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  <FiPlus size={16} /> Nova coluna
                </button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-gray-800 rounded-lg p-3 border border-sky-500 shadow-xl shadow-black/50 cursor-grabbing rotate-2">
              <p className="text-white text-sm font-medium mb-2">
                {activeTask.title}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${priorityDot[activeTask.priority]}`}
                />
                <span className="text-gray-400 text-xs">
                  {activeTask.module}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
                <div>
                  <label className="text-gray-200 text-xs mb-1 block">
                    Função
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setInviteForm({ ...inviteForm, role: "member" })
                      }
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border duration-200 ${inviteForm.role === "member" ? "bg-sky-500/20 border-sky-500 text-sky-400" : "bg-gray-800 border-gray-700 text-gray-400"}`}
                    >
                      Membro
                    </button>
                    <button
                      onClick={() =>
                        setInviteForm({ ...inviteForm, role: "admin" })
                      }
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border duration-200 ${inviteForm.role === "admin" ? "bg-purple-500/20 border-purple-500 text-purple-400" : "bg-gray-800 border-gray-700 text-gray-400"}`}
                    >
                      Admin
                    </button>
                  </div>
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

      {selectedTask && session?.user && (
        <TaskModal
          task={selectedTask}
          workspaceId={workspaceId}
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
