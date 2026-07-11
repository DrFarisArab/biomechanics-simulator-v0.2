"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/Sidebar";

const Scene = dynamic(() => import("@/components/Scene").then((m) => m.Scene), { ssr: false });

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex h-12 shrink-0 items-center border-b border-neutral-800 bg-neutral-900 px-4">
        <div className="text-[13px] font-semibold tracking-tight">Human Biomechanics Simulator</div>
        <div className="ml-2 rounded bg-teal-900/40 px-1.5 py-0.5 text-[10px] font-medium text-teal-400">
          v0.2 · arms
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <Scene />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
