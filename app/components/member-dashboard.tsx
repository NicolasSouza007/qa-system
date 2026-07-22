"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
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
import { useSession } from "next-auth/react";
import { TaskModal } from "@/app/components/modals/task-modal";
import { KanbanColumn } from "@/app/components/dashboard/kanban-column";

type ColumnDef = { key: string; label: string };
type Task = {
  id: string;
  title: string;
  column: string;
  priority: "high" | "medium" | "low";
  module: string;
  assignedTo: string;
};

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

export function MemberDashboard({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: session } = useSession();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  useEffect(() => {
    const q = query(
      collection(db, "tasks", workspaceId, "tasks"),
      where("assignedTo", "==", userId),
    );
    const unsubTasks = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
    });
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
      unsubWorkspace();
    };
  }, [userId, workspaceId]);

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

  return (
    <>
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
                onOpen={setSelectedTask}
              />
            ))}
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

      {selectedTask && session?.user && (
        <TaskModal
          task={selectedTask}
          workspaceId={workspaceId}
          isAdmin={false}
          currentUser={{
            id: session.user.id,
            name: session.user.name ?? "Usuário",
            photo: session.user.image ?? "",
          }}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
