"use client";
import { FiUser, FiPower, FiLoader } from "react-icons/fi";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export function Header() {
  const { data: session, status } = useSession();

  async function handleLogin() {
    await signIn("google");
  }

  async function handleLogout() {
    await signOut();
  }

  return (
    <header className="w-full flex items-center px-2 py-4 bg-black h-20">
      <div className="w-full flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/">
          <h1 className="font-bold hover:tracking-widest duration-300 text-2xl text-sky-300">
            QA <span className="text-white">System</span>
          </h1>
        </Link>

        {status === "loading" && (
          <button>
            <FiLoader size={26} className="text-white animate-spin" />
          </button>
        )}

        {status === "unauthenticated" && (
          <button onClick={handleLogin}>
            <FiUser size={26} className="text-white" />
          </button>
        )}

        {status === "authenticated" && (
          <div className="flex items-center gap-6">
            {/* botão acessar painel — só aparece quando logado */}
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg duration-200"
            >
              Acessar Painel
            </Link>

            {/* foto do usuário e nome */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "Usuário"}
                  width={36}
                  height={36}
                  className="rounded-full ring-2 ring-sky-300"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-sky-300 flex items-center justify-center text-black font-bold text-sm">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-white text-sm font-medium group-hover:text-sky-300 duration-300">
                {session?.user?.name?.split(" ")[0]}
              </span>
            </Link>

            <button onClick={handleLogout}>
              <FiPower
                size={26}
                className="text-white hover:text-sky-300 duration-300"
              />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
