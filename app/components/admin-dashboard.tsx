"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  onSnapshot,
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
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { FiPlus, FiUserPlus } from "react-icons/fi";
import { useSession } from "next-auth/react";
import { TaskModal } from "@/app/components/modals/task-modal";
import { NewTaskModal } from "@/app/components/modals/new-task-modal";
import { InviteModal } from "@/app/components/modals/invite-modal";
import { DeleteConfirmModal } from "@/app/components/modals/delete-confirm-modal";
import { KanbanColumn } from "@/app/components/dashboard/kanban-column";
import { MemberProgress } from "@/app/components/dashboard/member-progress";

type ColumnDef = { key: string; label: string };
type Task = {
  id: string;
  title: string;
  column: string;
  priority: "high" | "medium" | "low";
  module: string;
  assignedTo: string;
};
type User = { id: string; name: string; photo: string; role: string };

const defaultColumns: ColumnDef[] = [
  { key: "today", label: "Testes de hoje" },
  { key: "bugs", label: "Bugs" },
  { key: "review", label: "Revisão" },
  { key: "approved", label: "Aprovado" },
];

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [colToDelete, setColToDelete] = useState<string | null>(null);
  const [editingColKey, setEditingColKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const { data: session } = useSession();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
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
        const data: User[] = [];
        for (const d of snap.docs) {
          if (d.id === userId) continue;
          const uSnap = await import("firebase/firestore").then(
            ({ getDoc, doc: fDoc }) => getDoc(fDoc(db, "users", d.id)),
          );
          if (uSnap.exists())
            data.push({
              id: d.id,
              role: d.data().role,
              ...uSnap.data(),
            } as User);
        }
        setMembers(data);
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
  }

  async function handleRenameCol(key: string, label: string) {
    if (!label.trim()) return;
    const newCols = columns.map((c) =>
      c.key === key ? { ...c, label: label.trim() } : c,
    );
    setColumns(newCols);
    await saveColumns(newCols);
    setEditingColKey(null);
  }

  async function handleAddCol() {
    if (!newColLabel.trim()) return;
    const newCols = [
      ...columns,
      { key: `col_${Date.now()}`, label: newColLabel.trim() },
    ];
    setColumns(newCols);
    await saveColumns(newCols);
    setNewColLabel("");
    setAddingCol(false);
  }

  function handleRemoveCol(key: string) {
    if (tasks.some((t) => t.column === key)) {
      alert("Não é possível remover uma coluna que possui tasks.");
      return;
    }
    setColToDelete(key);
  }

  async function confirmRemoveCol() {
    if (!colToDelete) return;
    const newCols = columns.filter((c) => c.key !== colToDelete);
    setColumns(newCols);
    await saveColumns(newCols);
    setColToDelete(null);
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

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remover este membro do workspace?")) return;
    await deleteDoc(
      doc(db, "workspaceMembers", workspaceId, "members", memberId),
    );
  }

  return (
    <div>
      {/* Progresso do time */}
      {members.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h3 className="text-gray-200 text-sm font-medium mb-3 sm:mb-4">
            Progresso do time
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {members.map((member) => (
              <MemberProgress
                key={member.id}
                member={member}
                tasks={tasks}
                columns={columns}
                onRemove={handleRemoveMember}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header do board */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-gray-200 text-sm font-medium">Board geral</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-sky-500 hover:bg-sky-400 duration-200 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap"
          >
            <FiPlus size={14} /> Nova task
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 duration-200 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap"
          >
            <FiUserPlus size={14} /> Convidar
          </button>
        </div>
      </div>

      {/* Board Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 sm:gap-4 min-w-max">
            {columns.map((col) => (
              <KanbanColumn
                key={col.key}
                col={col}
                tasks={tasks.filter((t) => t.column === col.key)}
                members={members}
                onOpen={setSelectedTask}
                isAdmin
                isEditing={editingColKey === col.key}
                editingLabel={editingLabel}
                onEditingLabelChange={setEditingLabel}
                onEditBlur={() => handleRenameCol(col.key, editingLabel)}
                onEditKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameCol(col.key, editingLabel);
                  if (e.key === "Escape") setEditingColKey(null);
                }}
                onRename={startEditing}
                onRemove={handleRemoveCol}
                showVer
              />
            ))}

            {/* Botão nova coluna */}
            <div className="w-64 sm:w-72 shrink-0">
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
                  className="w-full h-16 sm:h-20 bg-gray-900/50 hover:bg-gray-900 border border-dashed border-gray-700 hover:border-gray-500 rounded-xl text-gray-500 hover:text-gray-300 duration-200 flex items-center justify-center gap-2 text-sm"
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

      {/* Modais */}
      {showNewTask && (
        <NewTaskModal
          workspaceId={workspaceId}
          columns={columns}
          members={members}
          onClose={() => setShowNewTask(false)}
        />
      )}

      {showInvite && (
        <InviteModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
        />
      )}

      {colToDelete && (
        <DeleteConfirmModal
          title="Remover coluna?"
          description={`"${columns.find((c) => c.key === colToDelete)?.label}"`}
          warning="A coluna será removida permanentemente do board."
          onConfirm={confirmRemoveCol}
          onCancel={() => setColToDelete(null)}
        />
      )}

      {selectedTask && session?.user && (
        <TaskModal
          task={selectedTask}
          workspaceId={workspaceId}
          isAdmin
          members={members}
          columns={columns}
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
