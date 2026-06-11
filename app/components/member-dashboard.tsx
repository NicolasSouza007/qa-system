"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

type Task = {
  id: string;
  title: string;
  column: "today" | "bugs" | "review" | "approved";
  priority: "high" | "medium" | "low";
  module: string;
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

export function MemberDashboard({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const q = query(collection(db, "tasks"), where("assignedTo", "==", userId));

    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
    });

    return () => unsub();
  }, [userId]);

  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.column === col.key);
        return (
          <div
            key={col.key}
            className="bg-gray-900 rounded-xl border border-gray-400 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium ${col.color}`}>
                {col.label}
              </span>
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {colTasks.length}
              </span>
            </div>

            {colTasks.length === 0 && (
              <p className="text-gray-400 text-xs text-center mt-8">
                Nenhuma task
              </p>
            )}

            {colTasks.map((task) => (
              <div
                key={task.id}
                className="bg-gray-800 rounded-lg p-3 mb-2 border border-gray-700 hover:border-gray-600 duration-200"
              >
                <p className="text-white text-sm font-medium mb-2">
                  {task.title}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${priorityDot[task.priority]}`}
                  />
                  <span className="text-gray-400 text-xs">{task.module}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
