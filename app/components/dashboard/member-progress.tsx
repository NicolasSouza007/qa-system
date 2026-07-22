"use client";
import { FiTrash2 } from "react-icons/fi";

type Task = { id: string; column: string; assignedTo: string };
type User = { id: string; name: string; photo: string; role: string };
type ColumnDef = { key: string; label: string };

export function MemberProgress({
  member,
  tasks,
  columns,
  onRemove,
}: {
  member: User;
  tasks: Task[];
  columns: ColumnDef[];
  onRemove: (id: string) => void;
}) {
  const memberTasks = tasks.filter((t) => t.assignedTo === member.id);

  return (
    <div className="bg-gray-900 border border-gray-500 rounded-xl p-3 sm:p-4">
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
            <p className="text-gray-200 text-xs">{memberTasks.length} tasks</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(member.id)}
          className="text-gray-600 hover:text-red-400 duration-200"
          title="Remover membro"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex-1 min-w-[60px] text-center bg-gray-800 rounded-lg py-1.5 px-1"
          >
            <p className="text-white text-sm font-semibold">
              {memberTasks.filter((t) => t.column === col.key).length}
            </p>
            <p className="text-gray-400 text-xs truncate">
              {col.label.split(" ")[0]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
