"use client";

import { useState } from "react";
import { db } from "@/app/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { Task } from "@/app/types/Task";

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

type Column = "today" | "bugs" | "review" | "approved";

type User = {
  id: string;
  name: string;
  photo: string;
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
      onClick={() => !isDragging && onOpen(task)}
      className="bg-gray-800 rounded-lg p-3 mb-2 border border-gray-700 hover:border-gray-600 duration-200 cursor-pointer"
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

          {assignee && (
            <img
              src={assignee.photo}
              alt={assignee.name}
              className="w-5 h-5 rounded-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  col,
  tasks,
  users,
  onOpenTask,
}: {
  col: { key: string; label: string; color: string };
  tasks: Task[];
  users?: User[];
  onOpenTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useSortable({
    id: col.key,
    data: { type: "column" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 bg-gray-900 rounded-xl border p-4 min-h-100 transition-colors duration-200  ${
        isOver ? "border-sky-500 bg-gray-800" : "border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-medium ${col.color}`}>{col.label}</span>

        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-8">Nenhuma task</p>
        )}

        {tasks.map((task) => (
          <SortableCard
            key={task.id}
            task={task}
            assignee={users?.find((u) => u.id === task.assignedTo)}
            onOpen={onOpenTask}
          />
        ))}
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  users,
  setTasks,
  onOpenTask,
}: {
  tasks: Task[];
  users?: User[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onOpenTask: (task: Task) => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);

    if (task) {
      setActiveTask(task);
    }
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
          t.id === activeId ? { ...t, column: overColumn.key as Column } : t,
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

    await updateDoc(doc(db, "tasks", activeId), {
      column: targetColumn,
    });
    console.log("OVER:", over?.id);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.key);

            return (
              <DroppableColumn
                key={col.key}
                col={col}
                tasks={colTasks}
                users={users}
                onOpenTask={onOpenTask}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="bg-gray-800 rounded-lg p-3 border border-sky-500 shadow-xl">
            <p className="text-white text-sm font-medium">{activeTask.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
