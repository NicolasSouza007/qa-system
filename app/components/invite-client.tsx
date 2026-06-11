"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function InviteClient({
  token,
  email,
  name,
}: {
  token: string;
  email: string;
  name: string;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("status:", status);
    console.log("session:", session);

    if (status !== "authenticated") return;

    if (session.user.email !== email) {
      setError(
        `Este convite é para ${email}. Você está logado com ${session.user.email}.`,
      );
      return;
    }

    console.log("chamando accept-invite com token:", token);

    fetch("/api/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        console.log("resposta accept-invite:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("data:", data);
        router.push("/dashboard");
      })
      .catch((err) => console.error("erro:", err));
  }, [status, session, token, email, router]);

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm mx-4 text-center">
        <h1 className="text-sky-300 text-2xl font-bold mb-1">
          QA <span className="text-white">System</span>
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Você foi convidado para o time
        </p>

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-white font-medium">{name}</p>
          <p className="text-gray-400 text-sm">{email}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {status === "unauthenticated" && !error && (
          <button
            onClick={() =>
              signIn("google", { callbackUrl: `/invite/${token}` })
            }
            className="w-full bg-sky-500 hover:bg-sky-400 duration-200 text-white font-medium py-3 rounded-lg text-sm"
          >
            Aceitar e entrar com Google
          </button>
        )}

        {status === "loading" && (
          <p className="text-gray-400 text-sm">Verificando...</p>
        )}

        {status === "authenticated" && !error && (
          <p className="text-gray-400 text-sm">Validando convite...</p>
        )}
      </div>
    </div>
  );
}
