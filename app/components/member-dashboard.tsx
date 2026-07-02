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
import { useSession } from "next-auth/react";
import { TaskModal } from "@/app/components/task-modal";

type ColumnDef = { key: string; label: string };

type Task = {
  id: string;
  title: string;
  column: string;
  priority: "high" | "medium" | "low";
  module: string;
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

function SortableCard({
  task,
  onOpen,
}: {
  task: Task;
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
      className="bg-gray-800 rounded-lg p-3 mb-2 border border-gray-700 hover:border-gray-600 duration-200"
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(task);
            }}
            className="text-white hover:text-gray-200 duration-200 text-sm px-2 py-0.5 rounded hover:bg-gray-900"
          >
            Ver
          </button>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  col,
  tasks,
  onOpen,
}: {
  col: ColumnDef;
  tasks: Task[];
  onOpen: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useSortable({
    id: col.key,
    data: { type: "column" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 bg-gray-900 rounded-xl border p-4 flex flex-col max-h-[calc(100vh-320px)] transition-colors duration-200 ${
        isOver ? "border-sky-500 bg-gray-800" : "border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="text-sm font-medium text-gray-200">{col.label}</span>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
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
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

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
  );

  useEffect(() => {
    const q = query(
      collection(db, "tasks", workspaceId, "tasks"),
      where("assignedTo", "==", userId),
    );
    const unsubTasks = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
    });

    // busca colunas do workspace
    const unsubWorkspace = onSnapshot(
      doc(db, "workspaces", workspaceId),
      (snap) => {
        const data = snap.data();
        if (data?.columns && Array.isArray(data.columns)) {
          setColumns(data.columns);
        }
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
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.column === col.key);
              return (
                <DroppableColumn
                  key={col.key}
                  col={col}
                  tasks={colTasks}
                  onOpen={setSelectedTask}
                />
              );
            })}
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
