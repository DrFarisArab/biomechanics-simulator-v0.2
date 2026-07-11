"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/Sidebar";
import { useArmSimStore, type Appearance } from "@/lib/store";

const Scene = dynamic(() => import("@/components/Scene").then((m) => m.Scene), { ssr: false });

const TABS: { id: Appearance; label: string }[] = [
  { id: "skeleton", label: "Skeleton" },
  { id: "muscles", label: "Muscles" },
];

export default function Home() {
  const appearance = useArmSimStore((s) => s.appearance);
  const setAppearance = useArmSimStore((s) => s.setAppearance);

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4">
        <div className="flex items-center">
          <div className="text-[13px] font-semibold tracking-tight">Human Biomechanics Simulator</div>
          <div className="ml-2 rounded bg-teal-900/40 px-1.5 py-0.5 text-[10px] font-medium text-teal-400">
            v0.2 · trunk + arms
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-neutral-700 bg-neutral-950/60 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setAppearance(t.id)}
              className={`rounded px-3 py-1 text-[11px] font-medium transition ${
                appearance === t.id
                  ? "bg-teal-900/40 text-teal-400"
                  : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              {t.label}
            </button>
          ))}
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
