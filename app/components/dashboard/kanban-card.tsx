"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Task = {
  id: string;
  title: string;
  column: string;
  priority: "high" | "medium" | "low";
  module: string;
  assignedTo: string;
};

type User = { id: string; name: string; photo: string; role: string };

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function KanbanCard({
  task,
  assignee,
  onOpen,
  showVer = false,
}: {
  task: Task;
  assignee?: User;
  onOpen: (task: Task) => void;
  showVer?: boolean;
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
      className="bg-gray-800 rounded-lg p-3 mb-2 border border-gray-600 hover:border-gray-400 duration-200 cursor-pointer"
      onClick={() => !showVer && onOpen(task)}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={(e) => showVer && e.stopPropagation()}
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
            {showVer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(task);
                }}
                className="text-gray-500 hover:text-gray-300 duration-200 text-xs px-2 py-0.5 rounded hover:bg-gray-700"
              >
                Ver
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
