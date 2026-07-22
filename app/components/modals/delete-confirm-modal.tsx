"use client";
import { FiAlertTriangle } from "react-icons/fi";

export function DeleteConfirmModal({
  title,
  description,
  warning,
  onConfirm,
  onCancel,
  confirming = false,
}: {
  title: string;
  description?: string;
  warning: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
            <FiAlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            {description && (
              <p className="text-gray-400 text-xs mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
          <p className="text-red-300 text-xs">{warning}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-lg duration-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 bg-red-500 hover:bg-red-400 disabled:bg-red-500/50 text-white text-sm font-medium py-2.5 rounded-lg duration-200"
          >
            {confirming ? "Removendo..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
