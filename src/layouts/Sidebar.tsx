import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Users,
  Trophy,
  UserPlus,
  Calendar,
  ListOrdered,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activePage: string;
}

const navGroups = [
  {
    label: 'Gestión',
    items: [
      { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'jugadores', path: '/jugadores', label: 'Jugadores', icon: Users },
      { id: 'categorias', path: '/categorias', label: 'Categorías', icon: Trophy }
    ]
  },
  {
    label: 'Torneo',
    items: [
      { id: 'inscripciones', path: '/inscripciones', label: 'Inscripciones', icon: UserPlus },
      { id: 'fixture', path: '/fixture', label: 'Fixture', icon: Calendar },
      { id: 'posiciones', path: '/posiciones', label: 'Posiciones', icon: ListOrdered }
    ]
  }
];

export function Sidebar({ activePage }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        'h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-20' : 'w-[260px]'
      )}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-400 flex items-center justify-center font-bold text-white shrink-0 shadow-lg shadow-indigo-500/20">
            <Activity size={20} />
          </div>
          {!isCollapsed && <span className="font-bold text-xl tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">VIBE EVENTS</span>}
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-8 overflow-y-auto custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && <div className="nav-label">{group.label}</div>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={cn(
                      'w-full flex items-center p-2.5 rounded-lg transition-all group',
                      isActive
                        ? 'bg-indigo-950 text-indigo-400 font-medium'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    )}
                  >
                    <Icon
                      size={18}
                      className={cn('shrink-0', isActive ? 'text-indigo-400' : 'group-hover:text-slate-300')}
                    />
                    {!isCollapsed && <span className="ml-3 text-sm truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800/50 mt-auto">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight size={20} />
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium">
              <ChevronLeft size={18} /> <span>Contraer</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
