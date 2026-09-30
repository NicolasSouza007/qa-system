"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  signInWithCustomToken,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import Link from "next/link";
import { FiMail, FiLock, FiHash, FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

export function LoginClient() {
  const [form, setForm] = useState({ code: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.email || !form.password) {
      setError("Preencha todos os campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. valida código do workspace e obtém custom token
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          workspaceCode: form.code,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao fazer login");
        setLoading(false);
        return;
      }

      // 2. autentica no Firebase Auth com e-mail e senha
      const { signInWithEmailAndPassword, getIdToken } =
        await import("firebase/auth");
      const userCred = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      );

      // 3. pega o ID token do Firebase para passar ao NextAuth
      const idToken = await getIdToken(userCred.user);

      // 4. cria sessão NextAuth
      const result = await signIn("credentials", {
        token: idToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Erro ao criar sessão");
        setLoading(false);
        return;
      }

      window.location.href = "/painel";
    } catch (err: any) {
      setError(err?.message ?? "Erro ao fazer login");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl: "/painel" });
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Lado esquerdo — visual */}
      <div className="hidden lg:flex flex-1 bg-linear-to-br from-gray-900 via-gray-800 to-black items-center justify-center p-12 relative overflow-hidden">
        {/* Elementos decorativos */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-sky-500/10 rounded-2xl rotate-12 border border-sky-500/20" />
        <div className="absolute bottom-32 right-10 w-24 h-24 bg-purple-500/10 rounded-2xl -rotate-6 border border-purple-500/20" />
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-sky-400/10 rounded-xl rotate-45 border border-sky-400/20" />

        <div className="relative z-10 text-center max-w-md">
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-sky-300">QA</span>{" "}
            <span className="text-white">System</span>
          </h1>
          <p className="text-gray-400 text-lg mb-12">
            Organize seus testes de forma prática e eficiente
          </p>

          {/* Cards decorativos */}
          <div className="flex flex-col gap-3">
            <div className="bg-gray-800/60 backdrop-blur border border-gray-700 rounded-xl p-4 flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-lg">📋</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Board Kanban</p>
                <p className="text-gray-400 text-xs">
                  Gerencie tasks em tempo real
                </p>
              </div>
            </div>
            <div className="bg-gray-800/60 backdrop-blur border border-gray-700 rounded-xl p-4 flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-lg">🎫</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  Tickets / Chamados
                </p>
                <p className="text-gray-400 text-xs">
                  Controle de chamados por cliente
                </p>
              </div>
            </div>
            <div className="bg-gray-800/60 backdrop-blur border border-gray-700 rounded-xl p-4 flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-lg">👥</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  Gestão de Clientes
                </p>
                <p className="text-gray-400 text-xs">
                  Cadastro e vinculação de clientes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold">
              <span className="text-sky-300">QA</span>{" "}
              <span className="text-white">System</span>
            </h1>
          </div>

          <h2 className="text-white text-2xl font-bold mb-1">Bem-vindo</h2>
          <p className="text-gray-400 text-sm mb-8">
            Por favor insira seus dados para fazer login.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Código da conta */}
            <div>
              <label className="text-gray-300 text-xs font-medium mb-1.5 block">
                Conta
              </label>
              <div className="relative">
                <FiHash
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Digite o código da sua conta..."
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500 duration-200"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="text-gray-300 text-xs font-medium mb-1.5 block">
                E-mail
              </label>
              <div className="relative">
                <FiMail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="email"
                  placeholder="Digite seu e-mail..."
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500 duration-200"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="text-gray-300 text-xs font-medium mb-1.5 block">
                Senha
              </label>
              <div className="relative">
                <FiLock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Digite sua senha..."
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500 duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 duration-200"
                >
                  {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg duration-200 text-sm mt-1"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs">ou continue com</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-white font-medium py-2.5 rounded-lg duration-200 text-sm"
          >
            <FcGoogle size={18} />
            Entrar com Google
          </button>

          {/* Links */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-400 text-xs duration-200"
            >
              ← Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
