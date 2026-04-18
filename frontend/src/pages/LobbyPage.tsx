import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../app/store';
import { setMatchData } from '../features/battle/battleSlice';
import { api } from '../shared/api';

export default function LobbyPage() {
  const [searching, setSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const ws = useRef<WebSocket | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any;

    const connect = () => {
      if (socket) socket.close();
      
      const WS_URL = import.meta.env.VITE_PUBLIC_WS_URL || 'ws://localhost:8000';
      const url = `${WS_URL}/ws/lobby${accessToken ? '?token=' + accessToken : ''}`;
      
      socket = new WebSocket(url);
      setConnectionStatus('connecting');

      socket.onopen = () => {
        setConnectionStatus('connected');
        console.log('Lobby WS connected');
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'online_count') {
          setOnlineCount(data.count);
        } else if (data.type === 'match_found') {
          console.log('Match found event received:', data);
          dispatch(setMatchData({
            matchId: data.match_id,
            status: 'matched',
            opponentId: data.player1_id === user?.id ? data.player2_id : data.player1_id
          }));
          setSearching(false);
          navigate(`/battle/${data.match_id}`);
        }
      };

      socket.onerror = (err) => {
        console.error('Lobby WS error:', err);
        setConnectionStatus('error');
      };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        console.log('Lobby WS disconnected, retrying in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.current = socket;
    };

    connect();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, [accessToken, user?.id, dispatch, navigate]);

  useEffect(() => {
    let interval: any;
    if (searching) {
      interval = setInterval(() => setSearchTime(t => t + 1), 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(interval);
  }, [searching]);

  const joinQueue = async () => {
    setSearching(true);
    try {
      const res = await api('/match/join', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'matched') {
         dispatch(setMatchData({
           matchId: data.match_id,
           status: 'matched',
           opponentId: data.opponent_id
         }));
         navigate(`/battle/${data.match_id}`);
      }
    } catch (e) {
      console.error('Failed to join queue', e);
      setSearching(false);
    }
  };

  const cancelSearch = async () => {
    try {
      await api('/match/leave', { method: 'POST' });
      setSearching(false);
    } catch (e) {
      console.error('Failed to leave queue', e);
      setSearching(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="lc-card p-10 flex flex-col items-center justify-center text-center bg-gradient-to-br from-lc-surface to-lc-bg border-lc-orange/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lc-orange/50 to-transparent"></div>
            
            <div className="mb-8 relative">
              <div className="w-24 h-24 rounded-full border-2 border-lc-orange/30 flex items-center justify-center relative">
                <div className={`w-16 h-16 rounded-full bg-lc-orange/10 flex items-center justify-center ${searching ? 'animate-pulse' : ''}`}>
                  <svg className="w-8 h-8 text-lc-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-lc-text-primary mb-3 tracking-tight">Ready for Combat?</h2>
            <p className="text-lc-text-secondary max-w-md mb-10 text-sm leading-relaxed">
              Step into the LeetCode Battleground. Face off against elite coders in high-stakes algorithmic duels.
            </p>

            <div className="w-full max-w-xs space-y-4">
              {!searching ? (
                <button
                  onClick={joinQueue}
                  className="w-full lc-button-primary py-4 text-base shadow-xl"
                >
                  Find a Match
                </button>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1 h-1.5">
                      {[1,2,3].map(i => <div key={i} className="w-6 h-full bg-lc-orange rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }}></div>)}
                    </div>
                    <span className="text-sm font-bold text-lc-orange uppercase tracking-widest mt-2">Searching Sector...</span>
                  </div>
                  <button
                    onClick={cancelSearch}
                    className="text-xs font-bold text-lc-text-muted hover:text-red-500 transition-colors"
                  >
                    Stop Matchmaking ({Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')})
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="lc-card p-6 bg-lc-surface/40 hover:border-lc-orange/30 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <span className="text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Training</span>
              </div>
              <h3 className="text-sm font-bold text-lc-text-primary mb-1">Practice Mode</h3>
              <p className="text-xs text-lc-text-secondary">Solve problems solo to hone your skills before the next duel.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="lc-card p-6">
            <h3 className="text-xs font-bold text-lc-text-muted uppercase tracking-widest mb-6">Battle Status</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-lc-text-secondary">Global Rank</span>
                <span className="text-xs font-bold text-lc-text-primary">#1,242</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-lc-text-secondary">Win Streak</span>
                <span className="text-xs font-bold text-lc-orange flex items-center gap-1">
                   3🔥
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-lc-text-secondary">Gateway</span>
                <div className="flex items-center gap-2">
                  <span className={`flex h-1.5 w-1.5 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                  }`}></span>
                  <span className="text-xs font-bold text-lc-text-primary capitalize">{connectionStatus}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-lc-text-secondary">Coders Online</span>
                <div className="flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-green-500/50"></span>
                  <span className="text-xs font-bold text-lc-text-primary">{onlineCount} connected</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lc-card p-6 border-l-2 border-l-lc-orange/50">
            <h3 className="text-xs font-bold text-lc-orange uppercase tracking-widest mb-4">Pro Tip</h3>
            <p className="text-xs text-lc-text-secondary leading-relaxed">
              Use <kbd className="px-1.5 py-0.5 rounded bg-lc-surface-elevated border border-lc-border text-[10px] text-lc-text-primary font-mono">Ctrl + Enter</kbd> to quickly run your code against public test cases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
