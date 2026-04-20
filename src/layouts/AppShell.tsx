import React from 'react';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  activePage: string;
}

export function AppShell({ children, activePage }: AppShellProps) {
  const title =
    activePage === 'dashboard'
      ? 'Panel de Control'
      : activePage === 'jugadores'
        ? 'Jugadores'
        : activePage === 'inscripciones'
          ? 'Inscripciones'
          : activePage === 'categorias'
            ? 'Categorías'
            : activePage === 'fixture'
              ? 'Fixture'
              : activePage === 'posiciones'
                ? 'Posiciones'
                : activePage.replace(/-/g, ' ');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 font-sans">
      <Sidebar activePage={activePage} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar p-10 gap-8">
        <header className="flex justify-between items-end shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white capitalize">{title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {activePage === 'dashboard'
                ? 'Resumen administrativo de la Liga de Padel'
                : `Gestionar sección de ${title}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded border border-indigo-500/20 uppercase tracking-wider">
              Supabase Live
            </div>
          </div>
        </header>

        <div className="max-w-7xl w-full mx-auto space-y-8">{children}</div>
      </main>
    </div>
  );
}
