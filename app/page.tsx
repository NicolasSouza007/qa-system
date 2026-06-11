import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-black h-screen w-max-full flex items-center justify-center">
      <main>
        <h1 className=" hover:tracking-widest duration-300 text-sky-300 text-7xl font-bold display-flex">
          QA <span className="text-white">SYSTEM</span>
        </h1>
        <p className="text-white place-items-center font-mono mt-6 align-center">
          Organize seus testes de forma prática e eficiente
        </p>
      </main>
    </div>
  );
}
