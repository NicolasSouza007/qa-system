"use client";
import { useRef } from "react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { KanbanCard } from "./kanban-card";

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

export function KanbanColumn({
  col,
  tasks,
  members,
  onOpen,
  isAdmin = false,
  isEditing = false,
  editingLabel = "",
  onEditingLabelChange,
  onEditBlur,
  onEditKeyDown,
  onRename,
  onRemove,
  showVer = false,
}: {
  col: ColumnDef;
  tasks: Task[];
  members?: User[];
  onOpen: (task: Task) => void;
  isAdmin?: boolean;
  isEditing?: boolean;
  editingLabel?: string;
  onEditingLabelChange?: (v: string) => void;
  onEditBlur?: () => void;
  onEditKeyDown?: (e: React.KeyboardEvent) => void;
  onRename?: (col: ColumnDef) => void;
  onRemove?: (key: string) => void;
  showVer?: boolean;
}) {
  const editInputRef = useRef<HTMLInputElement>(null);
  const { setNodeRef, isOver } = useSortable({
    id: col.key,
    data: { type: "column" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-64 sm:w-72 bg-gray-900 rounded-xl border p-3 sm:p-4 flex flex-col max-h-[60vh] sm:max-h-[calc(100vh-320px)] transition-colors duration-200 ${
        isOver ? "border-sky-500 bg-gray-800" : "border-gray-700"
      }`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4 shrink-0 gap-2">
        {isEditing ? (
          <input
            ref={editInputRef}
            value={editingLabel}
            onChange={(e) => onEditingLabelChange?.(e.target.value)}
            onBlur={onEditBlur}
            onKeyDown={onEditKeyDown}
            autoFocus
            className="flex-1 bg-gray-800 border border-sky-500 rounded px-2 py-0.5 text-white text-sm focus:outline-none"
          />
        ) : (
          <span
            className={`text-sm font-medium text-gray-200 flex-1 truncate ${isAdmin ? "cursor-pointer hover:text-white duration-200" : ""}`}
            onClick={() => isAdmin && onRename?.(col)}
          >
            {col.label}
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
          {isAdmin && (
            <>
              <button
                onClick={() => onRename?.(col)}
                className="text-gray-600 hover:text-gray-300 duration-200"
              >
                <FiEdit2 size={12} />
              </button>
              <button
                onClick={() => onRemove?.(col.key)}
                className="text-gray-600 hover:text-red-400 duration-200"
              >
                <FiTrash2 size={12} />
              </button>
            </>
          )}
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
            const assignee = members?.find((u) => u.id === task.assignedTo);
            return (
              <KanbanCard
                key={task.id}
                task={task}
                assignee={assignee}
                onOpen={onOpen}
                showVer={showVer}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
