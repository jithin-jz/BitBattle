import { useState, useEffect } from 'react';
import { api } from '../shared/api';
import { User } from '../shared/types';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api('/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setPlayers(data);
        }
      } catch (e) {
        console.error('Failed to load leaderboard', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-lc-text-primary">Hall of Fame</h1>
          <p className="mt-2 text-sm text-lc-text-secondary">The elite architects of the digital arena.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="lc-card px-4 py-2 flex items-center gap-3">
            <span className="text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Season 4</span>
            <span className="h-1 w-1 rounded-full bg-lc-orange"></span>
            <span className="text-xs font-bold text-lc-text-primary">Active</span>
          </div>
        </div>
      </div>

      <div className="lc-card overflow-hidden shadow-2xl fade-in" style={{ animationDelay: '0.1s' }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 border-2 border-lc-orange border-t-transparent animate-spin rounded-full"></div>
          </div>
        ) : players.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-8">
            <div className="text-3xl mb-4">🏆</div>
            <p className="text-lc-text-secondary">No champions have emerged yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-lc-border bg-lc-surface-elevated/30">
                  <th className="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Rank</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Coder</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest text-center">ELO Rating</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest text-center">Performance</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest text-right">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lc-border">
                {players.map((player, i) => (
                  <tr key={player.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {i === 0 ? <span className="text-xl">🥇</span> : 
                         i === 1 ? <span className="text-xl">🥈</span> : 
                         i === 2 ? <span className="text-xl">🥉</span> : 
                         <span className="text-sm font-mono text-lc-text-muted">#{(i + 1).toString().padStart(2, '0')}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded bg-lc-surface-elevated border border-lc-border flex items-center justify-center text-xs font-bold text-lc-orange">
                          {player.username?.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-lc-text-primary truncate max-w-[150px]">{player.username}</div>
                          <div className="text-[9px] font-bold text-lc-text-muted uppercase tracking-tighter">Contributor</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center rounded-full bg-lc-orange/10 px-3 py-1 text-xs font-bold text-lc-orange border border-lc-orange/20">
                        {player.rating}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="mx-auto max-w-[120px]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-lc-text-muted uppercase mb-1.5 font-mono">
                          <span>{player.wins}W</span>
                          <span>{player.losses}L</span>
                        </div>
                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-lc-surface-elevated">
                          <div
                            className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                            style={{ width: `${(player.wins / ((player.wins + player.losses) || 1)) * 100}%` }}
                          ></div>
                          <div
                            className="h-full bg-red-500/50"
                            style={{ width: `${(player.losses / ((player.wins + player.losses) || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-bold font-mono text-lc-text-primary">
                        {((player.wins / ((player.wins + player.losses) || 1)) * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
