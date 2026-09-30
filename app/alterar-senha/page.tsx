"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import { auth } from "@/app/lib/firebase";

export default function AlterarSenhaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function alterarSenha(e: React.FormEvent) {
    e.preventDefault();

    setErro("");
    setMensagem("");

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (novaSenha.length < 6) {
      setErro("A nova senha deve possuir pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("A confirmação da senha não confere.");
      return;
    }

    if (senhaAtual === novaSenha) {
      setErro("A nova senha deve ser diferente da senha atual.");
      return;
    }

    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      setErro("Usuário não autenticado no Firebase.");
      return;
    }

    if (!firebaseUser.email) {
      setErro("Este usuário não possui autenticação por e-mail e senha.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Primeiro confirma a senha atual.
       *
       * Isso é importante porque o Firebase pode exigir
       * uma autenticação recente para permitir a alteração
       * da senha.
       */
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        senhaAtual,
      );

      await reauthenticateWithCredential(firebaseUser, credential);

      /*
       * Depois da reautenticação, altera a senha.
       */
      await updatePassword(firebaseUser, novaSenha);

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");

      setMensagem("Senha alterada com sucesso!");

      /*
       * Depois de alguns segundos, volta para o painel.
       */
      setTimeout(() => {
        router.push("/painel");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);

      switch (error?.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/invalid-login-credentials":
          setErro("A senha atual está incorreta.");
          break;

        case "auth/weak-password":
          setErro("A nova senha é muito fraca.");
          break;

        case "auth/requires-recent-login":
          setErro(
            "Por segurança, faça login novamente antes de alterar a senha.",
          );
          break;

        case "auth/too-many-requests":
          setErro(
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
          );
          break;

        default:
          setErro("Não foi possível alterar a senha. Tente novamente.");
          break;
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");

    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Redirecionando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-2xl font-bold text-white">Alterar senha</h1>

          <p className="text-gray-400 text-sm mt-2 mb-6">
            Altere a senha da sua conta com segurança.
          </p>

          {erro && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}

          {mensagem && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
              <p className="text-green-400 text-sm">{mensagem}</p>
            </div>
          )}

          <form onSubmit={alterarSenha} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Senha atual
              </label>

              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
                disabled={loading}
                className="w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Nova senha
              </label>

              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite a nova senha"
                disabled={loading}
                className="w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white outline-none focus:border-sky-400"
              />

              <p className="text-gray-500 text-xs mt-1">
                Mínimo de 6 caracteres.
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Confirmar nova senha
              </label>

              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Digite novamente a nova senha"
                disabled={loading}
                className="w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white outline-none focus:border-sky-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 transition"
            >
              {loading ? "Alterando..." : "Alterar senha"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="w-full text-gray-400 hover:text-white text-sm py-2 transition"
            >
              Voltar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
