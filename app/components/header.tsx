"use client";
import { useEffect, useRef, useState } from "react";
import { FiUser, FiPower, FiLoader, FiBell } from "react-icons/fi";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/app/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";

type Notification = {
  id: string;
  taskId: string;
  taskTitle: string;
  message: string;
  read: boolean;
  createdAt: any;
  workspaceId: string;
};

export function Header() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", session.user.id),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification),
      );
    });

    return () => unsub();
  }, [session?.user?.id]);

  // fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  async function handleMarkRead(notificationId: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
  }

  async function handleMarkAllRead() {
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) => handleMarkRead(n.id)),
    );
  }

  function formatTime(timestamp: any) {
    if (!timestamp) return "";
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  return (
    <header className="w-full flex items-center px-4 py-3 bg-black h-16 sm:h-20 relative z-40">
      <div className="w-full flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/">
          <h1 className="font-bold hover:tracking-widest duration-300 text-xl sm:text-2xl text-sky-300 whitespace-nowrap">
            QA <span className="text-white">System</span>
          </h1>
        </Link>

        {status === "loading" && (
          <FiLoader size={22} className="text-white animate-spin" />
        )}

        {status === "unauthenticated" && (
          <button onClick={() => signIn("google")}>
            <FiUser
              size={22}
              className="text-white hover:text-sky-300 duration-300"
            />
          </button>
        )}

        {status === "authenticated" && (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/painel"
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs sm:text-sm font-semibold rounded-lg duration-200 whitespace-nowrap"
            >
              Acessar Painel
            </Link>

            <Link href="/dashboard" className="flex items-center gap-2 group">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "Usuário"}
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-sky-300 w-8 h-8 sm:w-9 sm:h-9"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sky-300 flex items-center justify-center text-black font-bold text-sm">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden sm:block text-white text-sm font-medium group-hover:text-sky-300 duration-300">
                {session?.user?.name?.split(" ")[0]}
              </span>
            </Link>

            {/* Sino de notificações */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1"
              >
                <FiBell
                  size={20}
                  className="text-white hover:text-sky-300 duration-300"
                />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {/* Dropdown de notificações */}
              {showNotifications && (
                <div className="absolute right-0 top-10 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                  {/* Header do dropdown */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <h3 className="text-white font-semibold text-sm">
                      Notificações
                    </h3>
                    {unread > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-sky-400 hover:text-sky-300 text-xs duration-200"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  {/* Lista de notificações */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <FiBell size={24} className="text-gray-600" />
                        <p className="text-gray-500 text-sm">
                          Nenhuma notificação
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkRead(n.id)}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800 duration-200 ${
                            !n.read ? "bg-sky-500/5" : ""
                          }`}
                        >
                          {/* bolinha indicadora */}
                          <div className="shrink-0 mt-1.5">
                            {!n.read ? (
                              <div className="w-2 h-2 rounded-full bg-sky-400" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-700" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-snug ${!n.read ? "text-white" : "text-gray-400"}`}
                            >
                              {n.message}
                            </p>
                            <p className="text-sky-400 text-xs mt-0.5 truncate">
                              📋 {n.taskTitle}
                            </p>
                            <p className="text-gray-600 text-xs mt-1">
                              {formatTime(n.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-800">
                      <p className="text-gray-600 text-xs text-center">
                        {unread} não {unread === 1 ? "lida" : "lidas"} ·{" "}
                        {notifications.length} no total
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => signOut()}>
              <FiPower
                size={20}
                className="text-white hover:text-sky-300 duration-300"
              />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
