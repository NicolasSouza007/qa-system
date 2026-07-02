"use client";
import { useEffect, useRef, useState } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  doc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import {
  FiX,
  FiSend,
  FiPaperclip,
  FiFile,
  FiDownload,
  FiImage,
  FiTrash2,
  FiAlertTriangle,
} from "react-icons/fi";

type Task = {
  id: string;
  title: string;
  column: string;
  priority: "high" | "medium" | "low";
  module: string;
};

type Comment = {
  id: string;
  text: string;
  authorName: string;
  authorPhoto: string;
  createdAt: any;
};

type Attachment = {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: any;
};

const priorityLabel: Record<string, { label: string; color: string }> = {
  high: {
    label: "Alta",
    color: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  medium: {
    label: "Média",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  },
  low: {
    label: "Baixa",
    color: "text-green-400 bg-green-500/10 border-green-500/30",
  },
};

const columnLabel: Record<string, string> = {
  today: "Testes de hoje",
  bugs: "Bugs",
  review: "Revisão",
  approved: "Aprovado",
};

export function TaskModal({
  task,
  workspaceId,
  currentUser,
  onClose,
}: {
  task: Task;
  workspaceId: string;
  currentUser: { id: string; name: string; photo: string };
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "tasks", workspaceId, "tasks", task.id, "comments"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment));
    });
    return () => unsub();
  }, [task.id, workspaceId]);

  useEffect(() => {
    const q = query(
      collection(db, "tasks", workspaceId, "tasks", task.id, "attachments"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setAttachments(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Attachment),
      );
    });
    return () => unsub();
  }, [task.id, workspaceId]);

  async function handleSendComment() {
    if (!commentText.trim()) return;
    setSending(true);
    await addDoc(
      collection(db, "tasks", workspaceId, "tasks", task.id, "comments"),
      {
        text: commentText.trim(),
        authorName: currentUser.name,
        authorPhoto: currentUser.photo,
        createdAt: serverTimestamp(),
      },
    );
    setCommentText("");
    setSending(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", task.id);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await addDoc(
        collection(db, "tasks", workspaceId, "tasks", task.id, "attachments"),
        {
          name: file.name,
          url: data.url,
          type: file.type,
          createdAt: serverTimestamp(),
        },
      );
    } catch (err) {
      console.error("Erro no upload:", err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteTask() {
    setDeleting(true);
    try {
      const taskRef = doc(db, "tasks", workspaceId, "tasks", task.id);

      // deleta todos os comentários
      const commentsSnap = await getDocs(collection(taskRef, "comments"));
      await Promise.all(commentsSnap.docs.map((d) => deleteDoc(d.ref)));

      // deleta todos os anexos
      const attachmentsSnap = await getDocs(collection(taskRef, "attachments"));
      await Promise.all(attachmentsSnap.docs.map((d) => deleteDoc(d.ref)));

      // deleta a task
      await deleteDoc(taskRef);

      onClose();
    } catch (err) {
      console.error("Erro ao deletar task:", err);
      setDeleting(false);
    }
  }

  function formatTime(timestamp: any) {
    if (!timestamp) return "";
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isImage(type: string) {
    return type.startsWith("image/");
  }

  const priority = priorityLabel[task.priority];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priority.color}`}
              >
                {priority.label}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400">
                {columnLabel[task.column] ?? task.column}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400">{task.module}</span>
            </div>
            <h2 className="text-white font-semibold text-lg leading-tight">
              {task.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-600 hover:text-red-400 duration-200"
              title="Excluir task"
            >
              <FiTrash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white duration-200"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Anexos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-300 text-sm font-medium flex items-center gap-2">
                <FiPaperclip size={14} />
                Anexos {attachments.length > 0 && `(${attachments.length})`}
              </h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 duration-200 disabled:opacity-50"
              >
                <FiImage size={13} />
                {uploading
                  ? `Enviando ${uploadProgress}%...`
                  : "Adicionar arquivo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {uploading && (
              <div className="w-full bg-gray-800 rounded-full h-1 mb-3">
                <div
                  className="bg-sky-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {attachments.length === 0 && !uploading && (
              <p className="text-gray-600 text-xs">Nenhum anexo ainda.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg p-2 duration-200 group"
                >
                  {isImage(att.type) ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center shrink-0">
                      <FiFile size={18} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">
                      {att.name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {formatTime(att.createdAt)}
                    </p>
                  </div>
                  <FiDownload
                    size={14}
                    className="text-gray-500 group-hover:text-sky-400 duration-200 shrink-0"
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Comentários */}
          <div>
            <h3 className="text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
              💬 Comentários {comments.length > 0 && `(${comments.length})`}
            </h3>

            {comments.length === 0 && (
              <p className="text-gray-600 text-xs mb-4">
                Nenhum comentário ainda.
              </p>
            )}

            <div className="flex flex-col gap-4 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <img
                    src={comment.authorPhoto}
                    alt={comment.authorName}
                    className="w-7 h-7 rounded-full shrink-0 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-xs font-medium">
                        {comment.authorName.split(" ")[0]}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                    <div className="bg-gray-800 rounded-lg px-3 py-2">
                      <p className="text-gray-300 text-sm">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Input comentário */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.photo}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full shrink-0"
            />
            <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus-within:border-sky-500 duration-200">
              <input
                type="text"
                placeholder="Escrever um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSendComment()
                }
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
              />
              <button
                onClick={handleSendComment}
                disabled={sending || !commentText.trim()}
                className="text-sky-400 hover:text-sky-300 disabled:text-gray-600 duration-200"
              >
                <FiSend size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                <FiAlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Excluir task?</h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
              <p className="text-red-300 text-xs">
                Os comentários e os arquivos importados serão apagados
                permanentemente.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-lg duration-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-400 disabled:bg-red-500/50 text-white text-sm font-medium py-2.5 rounded-lg duration-200 disabled:cursor-not-allowed"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
