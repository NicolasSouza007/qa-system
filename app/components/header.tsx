"use client";

import { useEffect, useRef, useState } from "react";

import {
  FiUser,
  FiPower,
  FiLoader,
  FiBell,
  FiSettings,
  FiLock,
} from "react-icons/fi";

import { signOut, useSession } from "next-auth/react";

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
  const [showUserMenu, setShowUserMenu] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // NOTIFICAÇÕES
  // ============================================================

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
        snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            }) as Notification,
        ),
      );
    });

    return () => unsub();
  }, [session?.user?.id]);

  // ============================================================
  // FECHAR DROPDOWNS AO CLICAR FORA
  // ============================================================

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      // Fecha notificações
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowNotifications(false);
      }

      // Fecha menu do usuário
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ============================================================
  // NOTIFICAÇÕES
  // ============================================================

  const unread = notifications.filter((n) => !n.read).length;

  async function handleMarkRead(notificationId: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId,
      }),
    });
  }

  async function handleMarkAllRead() {
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) => handleMarkRead(n.id)),
    );
  }

  // ============================================================
  // FORMATAÇÃO DE DATA
  // ============================================================

  function formatTime(timestamp: any) {
    if (!timestamp) return "";

    const date = timestamp.toDate?.() ?? new Date(timestamp);

    const now = new Date();

    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "agora";

    if (diff < 3600) {
      return `${Math.floor(diff / 60)}min`;
    }

    if (diff < 86400) {
      return `${Math.floor(diff / 3600)}h`;
    }

    return `${Math.floor(diff / 86400)}d`;
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async function handleLogout() {
    setShowUserMenu(false);

    await signOut({
      callbackUrl: "/login",
    });
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <header className="w-full flex items-center px-4 py-3 bg-black h-16 sm:h-20 relative z-40">
      <div className="w-full flex items-center justify-between max-w-7xl mx-auto">
        {/* =====================================================
            LOGO
        ====================================================== */}

        <Link href="/">
          <h1 className="font-bold hover:tracking-widest duration-300 text-xl sm:text-2xl text-sky-300 whitespace-nowrap">
            QA <span className="text-white">System</span>
          </h1>
        </Link>

        {/* =====================================================
            LOADING
        ====================================================== */}

        {status === "loading" && (
          <FiLoader size={22} className="text-white animate-spin" />
        )}

        {/* =====================================================
            NÃO AUTENTICADO
        ====================================================== */}

        {status === "unauthenticated" && (
          <Link href="/login">
            <FiUser
              size={22}
              className="text-white hover:text-sky-300 duration-300"
            />
          </Link>
        )}

        {/* =====================================================
            AUTENTICADO
        ====================================================== */}

        {status === "authenticated" && (
          <div className="flex items-center gap-2 sm:gap-4">
            {/* =================================================
                BOTÃO PAINEL
            ================================================== */}

            <Link
              href="/painel"
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs sm:text-sm font-semibold rounded-lg duration-200 whitespace-nowrap"
            >
              Acessar Painel
            </Link>

            {/* =================================================
                USUÁRIO + DROPDOWN
            ================================================== */}

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 group"
              >
                {/* FOTO */}

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

                {/* NOME */}

                <span className="hidden sm:block text-white text-sm font-medium group-hover:text-sky-300 duration-300">
                  {session?.user?.name?.split(" ")[0]}
                </span>
              </button>

              {/* =================================================
                  MENU DROPDOWN
              ================================================== */}

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-72 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                  {/* CABEÇALHO DO USUÁRIO */}

                  <div className="px-4 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      {session?.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user.name ?? "Usuário"}
                          width={42}
                          height={42}
                          className="rounded-full ring-2 ring-sky-300"
                        />
                      ) : (
                        <div className="w-42px h-42px rounded-full bg-sky-300 flex items-center justify-center text-black font-bold">
                          {session?.user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {session?.user?.name ?? "Usuário"}
                        </p>

                        <p className="text-gray-500 text-xs truncate">
                          {session?.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* OPÇÕES */}

                  <div className="p-2">
                    {/* CONFIGURAÇÕES */}

                    <Link
                      href="/configuracoes"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 duration-200"
                    >
                      <FiSettings size={18} className="text-sky-400" />

                      <div className="text-left">
                        <p className="text-sm font-medium">Configurações</p>

                        <p className="text-xs text-gray-500">
                          Configurações da conta
                        </p>
                      </div>
                    </Link>

                    {/* ALTERAR SENHA */}

                    <Link
                      href="/alterar-senha"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 duration-200"
                    >
                      <FiLock size={18} className="text-sky-400" />

                      <div className="text-left">
                        <p className="text-sm font-medium">Alterar senha</p>

                        <p className="text-xs text-gray-500">
                          Atualize sua senha
                        </p>
                      </div>
                    </Link>
                  </div>

                  {/* LOGOUT */}

                  <div className="p-2 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 duration-200"
                    >
                      <FiPower size={18} />

                      <div className="text-left">
                        <p className="text-sm font-medium">Sair</p>

                        <p className="text-xs text-red-400/60">
                          Encerrar sessão
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* =================================================
                SINO DE NOTIFICAÇÕES
            ================================================== */}

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);

                  setShowUserMenu(false);
                }}
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

              {/* =================================================
                  DROPDOWN DE NOTIFICAÇÕES
              ================================================== */}

              {showNotifications && (
                <div className="absolute right-0 top-10 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                  {/* HEADER */}

                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <h3 className="text-white font-semibold text-sm">
                      Notificações
                    </h3>

                    {unread > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-sky-400 hover:text-sky-300 text-xs duration-200"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  {/* LISTA */}

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
                          {/* BOLINHA */}

                          <div className="shrink-0 mt-1.5">
                            {!n.read ? (
                              <div className="w-2 h-2 rounded-full bg-sky-400" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-700" />
                            )}
                          </div>

                          {/* CONTEÚDO */}

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-snug ${
                                !n.read ? "text-white" : "text-gray-400"
                              }`}
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

                  {/* RODAPÉ */}

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
          </div>
        )}
      </div>
    </header>
  );
}
