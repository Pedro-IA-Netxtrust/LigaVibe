import React from 'react';
import { Loader2, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export function LoadingState({ message = 'Cargando datos...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      <p className="text-slate-400 text-sm font-medium">{message}</p>
    </div>
  );
}

export function EmptyState({ 
  title = 'No hay datos', 
  description = 'No se encontraron registros para mostrar en este momento.',
  icon: Icon = Inbox
}: { 
  title?: string; 
  description?: string;
  icon?: any;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
      <div className="p-4 bg-slate-900 rounded-full mb-4">
        <Icon className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      <p className="max-w-xs text-sm text-slate-500 mt-1">{description}</p>
    </div>
  );
}
