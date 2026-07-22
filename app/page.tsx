import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-black h-screen w-full flex items-center justify-center px-6">
      <main className="flex flex-col items-center text-center">
        <h1 className="hover:tracking-widest duration-300 text-sky-300 text-5xl sm:text-7xl font-bold">
          QA <span className="text-white">SYSTEM</span>
        </h1>
        <p className="text-white font-mono mt-6 text-sm sm:text-base max-w-xs sm:max-w-none">
          Organize seus testes de forma prática e eficiente
        </p>
      </main>
    </div>
  );
}
