import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useCategories } from '../hooks/useTeams';
import { fixtureService } from '../services/fixtureService';
import { resultService } from '../services/resultService';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { MatchResultModal, MatchRow } from '../components/results/MatchResultModal';
import { PlayoffPanel } from '../components/playoff/PlayoffPanel';

export default function Playoffs() {
  const { categories } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('');
  const [status, setStatus] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [modalMatch, setModalMatch] = React.useState<MatchRow | null>(null);

  function ActiveCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || '';
  }

  React.useEffect(() => {
    const catId = ActiveCategoryFromURL();
    if (catId) {
      setSelectedCategoryId(catId);
    } else if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const loadStatusAndData = React.useCallback(async () => {
    if (!selectedCategoryId) return;
    setError(null);
    try {
      const s = await fixtureService.getStatus(selectedCategoryId);
      setStatus(s);
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedCategoryId]);

  React.useEffect(() => {
    loadStatusAndData();
  }, [loadStatusAndData]);

  return (
    <div className="space-y-8">
      {/* Category selection bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto custom-scrollbar no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedCategoryId(cat.id);
              const url = new URL(window.location.href);
              url.searchParams.set('category', cat.id);
              window.history.pushState({}, '', url.toString());
            }}
            className={cn(
              'px-6 py-4 text-sm font-bold transition-all duration-200 shrink-0 relative',
              selectedCategoryId === cat.id
                ? 'text-white bg-indigo-500/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            )}
          >
            {cat.name}
            {selectedCategoryId === cat.id && (
              <motion.div
                layoutId="activeCategory"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
              />
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {selectedCategoryId && (
        <div className="space-y-8">
          <PlayoffPanel
            categoryId={selectedCategoryId}
            isCategoryClosed={status?.state === 'closed'}
            onEditMatch={(m) => setModalMatch(m)}
            onError={(msg) => setError(msg || null)}
          />
        </div>
      )}

      {/* Match Result Modal */}
      <MatchResultModal
        isOpen={!!modalMatch}
        match={modalMatch}
        onClose={() => setModalMatch(null)}
        onSaved={loadStatusAndData}
        onSubmit={(id, payload) => resultService.updateMatchResult(id, payload)}
      />
    </div>
  );
}
