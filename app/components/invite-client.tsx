"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { auth } from "@/app/lib/firebase";

export function InviteClient({
  token,
  email,
  name,
}: {
  token: string;
  email: string;
  name: string;
}) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("A senha deve possuir pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      // ==========================================================
      // 1. ACEITA O CONVITE E DEFINE A SENHA
      // ==========================================================

      const res = await fetch("/api/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível aceitar o convite.");
        setLoading(false);
        return;
      }

      // ==========================================================
      // 2. LOGIN AUTOMÁTICO COM E-MAIL + SENHA
      // ==========================================================

      setSuccess("Senha definida com sucesso! Entrando...");

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // ==========================================================
      // 3. PEGA O ID TOKEN DO FIREBASE
      // ==========================================================

      const idToken = await getIdToken(userCredential.user);

      // ==========================================================
      // 4. CRIA A SESSÃO DO NEXTAUTH
      // ==========================================================

      const result = await signIn("credentials", {
        token: idToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Senha definida, mas não foi possível criar a sessão.");
        setLoading(false);
        return;
      }

      // ==========================================================
      // 5. VAI PARA O DASHBOARD
      // ==========================================================

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Erro ao aceitar convite:", err);

      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password"
      ) {
        setError(
          "A senha foi definida, mas não foi possível realizar o login automático.",
        );
      } else if (err?.code === "auth/user-not-found") {
        setError("Usuário não encontrado no Firebase Authentication.");
      } else {
        setError("Ocorreu um erro ao configurar sua conta.");
      }

      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoadingGoogle(true);

    try {
      await signIn("google", {
        callbackUrl: `/invite/${token}`,
      });
    } catch (err) {
      console.error("Erro ao entrar com Google:", err);

      setError("Não foi possível entrar com Google.");
      setLoadingGoogle(false);
    }
  }

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      {" "}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm mx-4">
        {/* LOGO */}

        <div className="text-center">
          <h1 className="text-sky-300 text-2xl font-bold mb-1">
            QA <span className="text-white">System</span>
          </h1>

          <p className="text-gray-400 text-sm mb-6">
            Você foi convidado para o time
          </p>
        </div>

        {/* DADOS DO CONVITE */}

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-white font-medium">{name}</p>

          <p className="text-gray-400 text-sm">{email}</p>
        </div>

        {/* ERRO */}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* SUCESSO */}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* FORMULÁRIO */}

        <form onSubmit={handleAcceptInvite} className="flex flex-col gap-4">
          {/* SENHA */}

          <div>
            <label className="text-gray-300 text-xs font-medium mb-1.5 block">
              Criar senha
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha..."
                disabled={loading || loadingGoogle}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 pr-16 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500 duration-200"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            <p className="text-gray-600 text-xs mt-1">
              Mínimo de 6 caracteres.
            </p>
          </div>

          {/* CONFIRMAR SENHA */}

          <div>
            <label className="text-gray-300 text-xs font-medium mb-1.5 block">
              Confirmar senha
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente..."
                disabled={loading || loadingGoogle}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 pr-16 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500 duration-200"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                {showConfirmPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {/* BOTÃO */}

          <button
            type="submit"
            disabled={loading || loadingGoogle}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 disabled:cursor-not-allowed duration-200 text-white font-medium py-3 rounded-lg text-sm"
          >
            {loading
              ? "Configurando sua conta..."
              : "Definir senha e aceitar convite"}
          </button>
        </form>

        {/* GOOGLE */}

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-800" />

          <span className="text-gray-600 text-xs">ou</span>

          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading || loadingGoogle}
          className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 duration-200 text-white font-medium py-3 rounded-lg text-sm"
        >
          {loadingGoogle
            ? "Entrando com Google..."
            : "Aceitar e entrar com Google"}
        </button>

        {/* INFORMAÇÃO */}

        <p className="text-gray-600 text-xs text-center mt-5">
          Ao aceitar o convite, você poderá entrar posteriormente usando seu
          Google ou e-mail e senha.
        </p>
      </div>
    </div>
  );
}
