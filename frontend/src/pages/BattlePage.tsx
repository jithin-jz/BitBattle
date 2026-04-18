import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { setMatchData, updateTimer, setOpponentStatus, resetBattle, setPlayerConnection } from '../features/battle/battleSlice';
import { TestResult, OpponentStatus } from '../shared/types';
import { api } from '../shared/api';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BattlePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: battle, opponentStatus, playerStatuses } = useSelector((state: RootState) => state.battle);
  const { user, accessToken } = useSelector((state: RootState) => state.auth);

  const [code, setCode] = useState("// Write your solution here\n\nfunction solution(input) {\n  // Your code\n}\n");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'problem' | 'editor' | 'output'>('editor');
  const [mobileView, setMobileView] = useState<'problem' | 'editor'>('editor');
  const [rematchStatus, setRematchStatus] = useState<'idle' | 'requested' | 'proposed' | 'declined' | 'accepted'>('idle');
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!matchId || !accessToken) return;

    const WS_URL = import.meta.env.VITE_PUBLIC_WS_URL || 'ws://localhost:8000';
    const socket = new WebSocket(`${WS_URL}/ws/match/${matchId}?token=${accessToken}`);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'match_start':
          dispatch(setMatchData({
            status: 'started',
            problem: msg.problem,
            testCases: msg.test_cases || [],
            timeRemaining: msg.problem?.time_limit || 600,
            player1Id: msg.player1_id,
            player2Id: msg.player2_id,
            player1Username: msg.player1_username,
            player2Username: msg.player2_username,
          }));
          // Initialize statuses
          dispatch(setPlayerConnection({ userId: msg.player1_id, username: msg.player1_username, connected: true }));
          dispatch(setPlayerConnection({ userId: msg.player2_id, username: msg.player2_username, connected: true }));
          setTestResults(prev => [...prev, { passed: true, input: 'System', expected: 'OK', actual: 'Battle ready. Good luck!' } as any]);
          break;
        case 'timer_update':
          dispatch(updateTimer(msg.remaining));
          break;
        case 'match_end':
          dispatch(setMatchData({ status: 'finished', winnerId: msg.winner_id || null }));
          const isWinner = msg.winner_id === user?.id;
          setTestResults(prev => [...prev, { 
            passed: isWinner, 
            input: 'System', 
            expected: 'END', 
            actual: isWinner ? 'MATCH CONCLUDED. STATUS: VICTORY' : 'MATCH CONCLUDED. STATUS: DEFEAT' 
          } as any]);
          break;
        case 'rematch_proposal':
          setRematchStatus('proposed');
          break;
        case 'rematch_denied':
          setRematchStatus('declined');
          break;
        case 'rematch_started':
          setRematchStatus('accepted');
          setTimeout(() => {
            navigate(`/battle/${msg.new_match_id}`);
            window.location.reload(); // Hard reload to reset all states
          }, 1000);
          break;
        case 'opponent_submission':
          dispatch(setOpponentStatus(msg.status));
          break;
        case 'player_connected':
          dispatch(setPlayerConnection({
            userId: msg.user_id,
            username: msg.username,
            connected: true
          }));
          if (msg.user_id !== user?.id) {
             setTestResults(prev => [...prev, { passed: true, input: 'System', expected: 'OK', actual: `${msg.username} has entered the battle.` } as any]);
          }
          break;
        case 'player_disconnected':
          if (msg.user_id in playerStatuses) {
            const lostPlayer = playerStatuses[msg.user_id];
            dispatch(setPlayerConnection({
              userId: msg.user_id,
              username: lostPlayer.username,
              connected: false
            }));
            setTestResults(prev => [...prev, { passed: false, input: 'System', expected: 'STAY', actual: `${lostPlayer.username} has abandoned the match!` } as any]);
          }
          break;
      }
    };

    ws.current = socket;
    return () => {
      socket.close();
      dispatch(resetBattle());
    };
  }, [matchId, accessToken, dispatch]);

  const runTests = async () => {
    if (!battle.problem) return;
    setSubmitting(true);
    setActiveTab('output');
    
    const startTime = performance.now();
    
    // Simulate execution
    const results: TestResult[] = battle.testCases.map((tc, i) => {
      try {
        const fn = new Function('input', `${code}\nreturn solution(input);`);
        const actual = fn(JSON.parse(tc.input));
        const expected = JSON.parse(tc.expected_output);
        return {
          passed: JSON.stringify(actual) === JSON.stringify(expected),
          input: tc.input,
          expected: tc.expected_output,
          actual: JSON.stringify(actual)
        };
      } catch (e: any) {
        return {
          passed: false,
          input: tc.input,
          expected: tc.expected_output,
          actual: 'Error',
          error: e.message
        };
      }
    });

    setTestResults(results);
    setSubmitting(false);

    const allPassed = results.length > 0 && results.every(r => r.passed);
    if (allPassed) {
      // Send result to opponent via socket
      ws.current?.send(JSON.stringify({
        type: 'submission_result',
        status: 'passed'
      }));
    }
  };

  const handleSubmit = () => {
    if (!battle.problem || battle.status === 'finished') return;
    setSubmitting(true);
    
    ws.current?.send(JSON.stringify({
      type: 'submit',
      code: code,
      passed: true
    }));
  };

  const handleRematchRequest = () => {
    setRematchStatus('requested');
    ws.current?.send(JSON.stringify({ type: 'rematch_request' }));
  };

  const handleRematchAccept = () => {
    setRematchStatus('accepted');
    ws.current?.send(JSON.stringify({ type: 'rematch_accept' }));
  };

  const handleRematchDecline = () => {
    setRematchStatus('idle');
    ws.current?.send(JSON.stringify({ type: 'rematch_decline' }));
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isPlayer1 = user?.id === battle.player1Id;
  const isPlayer2 = user?.id === battle.player2Id;

  return (
    <div className="flex-grow flex flex-col bg-lc-bg min-h-0 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-lc-border bg-lc-surface flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-base font-mono font-bold ${battle.timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-lc-orange'}`}>
              {formatTimer(battle.timeRemaining)}
            </span>
          </div>
          
          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden bg-lc-surface-elevated rounded-md p-0.5 border border-lc-border ml-2">
            <button 
              onClick={() => setMobileView('problem')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${mobileView === 'problem' ? 'bg-lc-orange text-black' : 'text-lc-text-secondary'}`}
            >
              Problem
            </button>
            <button 
              onClick={() => setMobileView('editor')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${mobileView === 'editor' ? 'bg-lc-orange text-black' : 'text-lc-text-secondary'}`}
            >
              Code
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
           {/* Player Statuses - Condensed for mobile */}
           <div className="flex items-center gap-2 sm:gap-3 mr-1 sm:mr-4">
             <div className="flex items-center gap-1.5">
               <div className={`h-1.5 w-1.5 rounded-full ${playerStatuses[battle.player1Id!]?.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-lc-text-muted'}`}></div>
               <span className={`text-[10px] font-bold tracking-tighter uppercase ${isPlayer1 ? 'text-lc-orange' : 'text-lc-text-primary'}`}>
                 {battle.player1Username?.slice(0, 8)}{battle.player1Username?.length! > 8 ? '..' : ''}
               </span>
             </div>
             <span className="text-lc-text-muted text-[10px]">VS</span>
             <div className="flex items-center gap-1.5">
               <span className={`text-[10px] font-bold tracking-tighter uppercase ${isPlayer2 ? 'text-lc-orange' : 'text-lc-text-primary'}`}>
                 {battle.player2Username?.slice(0, 8)}{battle.player2Username?.length! > 8 ? '..' : ''}
               </span>
               <div className={`h-1.5 w-1.5 rounded-full ${playerStatuses[battle.player2Id!]?.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-lc-text-muted'}`}></div>
             </div>
           </div>

           {battle.status === 'finished' && (
             <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                {battle.winnerId === user?.id ? 'Won' : 'Done'}
             </div>
           )}
        </div>
      </div>

      <div className="flex-grow lg:grid lg:grid-cols-2 overflow-hidden min-h-0">
        {/* Left Column: Problem (Hidden on mobile if editor is active) */}
        <div className={`flex flex-col border-r border-lc-border bg-lc-surface-elevated/20 overflow-y-auto ${mobileView === 'editor' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 sm:p-6 lg:max-h-full">
            <h1 className="text-xl sm:text-2xl font-bold text-lc-text-primary mb-4 sm:mb-6">{battle.problem?.title || 'Loading problem...'}</h1>
            <div className="prose prose-sm prose-invert prose-orange max-w-none text-lc-text-secondary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {battle.problem?.description || 'Waiting for match coordinates...'}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor */}
        <div className={`flex flex-col bg-lc-bg overflow-hidden border-t lg:border-t-0 border-lc-border ${mobileView === 'problem' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex-grow min-h-[300px]">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 24,
                padding: { top: 20 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
              }}
            />
          </div>

          <div className="h-[250px] border-t border-[#333333] bg-[#1e1e1e] overflow-hidden flex flex-col font-mono text-sm">
            <div className="h-9 flex items-center shrink-0 border-b border-[#333333] px-4 gap-6 bg-[#1e1e1e] text-[#969696] text-[11px] uppercase tracking-wide">
               <span className="cursor-pointer hover:text-[#cccccc]">Problems</span>
               <span className="cursor-pointer hover:text-[#cccccc]">Output</span>
               <span className="cursor-pointer hover:text-[#cccccc]">Debug Console</span>
               <span className="cursor-pointer border-b border-[#0078d4] text-[#cccccc] h-full flex items-center">Terminal</span>
                <div className="ml-auto flex items-center gap-3">
                  <button onClick={runTests} disabled={submitting || battle.status === 'finished'} className="flex items-center gap-1.5 text-lc-orange hover:text-orange-400 transition-colors uppercase font-bold text-[10px] disabled:opacity-30">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    Run Code
                  </button>
                  {testResults.length > 0 && testResults.every(r => r.passed) && battle.status !== 'finished' && (
                    <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-1.5 bg-lc-orange text-black px-3 py-1 rounded hover:bg-orange-400 transition-colors uppercase font-bold text-[10px] animate-in slide-in-from-right-2">
                       <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                       Submit
                    </button>
                  )}
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-1 bg-[#1e1e1e] text-[#cccccc]">
              {testResults.length === 0 ? (
                <div className="text-[#cccccc]/50">
                  <div className="text-green-500 mb-2">LeetCode Battle Integrated Terminal v1.0.0</div>
                  <div>$ Waiting for execution...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-green-500 mb-2">LeetCode Battle Integrated Terminal v1.0.0</div>
                  <div className="text-blue-400">$ node execute_tests.js</div>
                  {testResults.map((res, i) => (
                    <div key={i} className="pl-4 border-l-2 border-[#333333]">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[#87ceeb]">↳ Test #{i+1}:</span>
                        {res.passed ? (
                          <span className="text-[#89d185]">✓ Passed</span>
                        ) : (
                          <span className="text-[#f14c4c]">✗ Failed</span>
                        )}
                      </div>
                      {!res.passed && (
                        <div className="pl-4 text-[#cccccc]/70 text-[12px] space-y-1">
                          <div className="flex"><span className="w-20 text-[#569cd6]">Input:</span> <span className="text-[#ce9178]">{res.input}</span></div>
                          <div className="flex"><span className="w-20 text-[#569cd6]">Expected:</span> <span className="text-[#4ec9b0]">{res.expected}</span></div>
                          <div className="flex"><span className="w-20 text-[#569cd6]">Actual:</span> <span className="text-[#f14c4c]">{res.actual}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                  {testResults.length > 0 && testResults.every(r => r.passed) && (
                    <div className="mt-4 text-[#89d185] font-bold">✨ All test cases passed successfully!</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* End Match Overlay */}
      {battle.status === 'finished' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="lc-card p-10 max-w-sm w-full text-center space-y-6 border-lc-orange shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className={`text-5xl font-black uppercase tracking-tighter ${battle.winnerId === user?.id ? 'text-lc-orange animate-bounce' : 'text-lc-text-muted'}`}>
              {battle.winnerId === user?.id ? 'Victory' : 'Defeat'}
            </div>
            <p className="text-lc-text-secondary text-sm">
              {battle.winnerId === user?.id 
                ? "You've successfully solved the challenge and climbed the ranks!" 
                : "Your opponent was faster this time. Take a breath and try again."}
            </p>
            <div className="pt-4 space-y-3">
               {/* Rematch Section */}
               {battle.winnerId !== user?.id && rematchStatus === 'idle' && (
                 <button onClick={handleRematchRequest} className="w-full lc-button-secondary border-lc-orange text-lc-orange">
                   Request Revenge
                 </button>
               )}

               {battle.winnerId !== user?.id && rematchStatus === 'requested' && (
                 <div className="text-xs text-lc-orange animate-pulse py-2">Waiting for opponent response...</div>
               )}

               {battle.winnerId === user?.id && rematchStatus === 'proposed' && (
                 <div className="space-y-2 animate-in slide-in-from-bottom-2">
                   <div className="text-[10px] text-lc-orange uppercase font-bold">Opponent wants a rematch!</div>
                   <div className="flex gap-2">
                     <button onClick={handleRematchAccept} className="flex-1 lc-button-primary py-2 text-[10px]">Accept</button>
                     <button onClick={handleRematchDecline} className="flex-1 lc-button-secondary py-2 text-[10px]">Decline</button>
                   </div>
                 </div>
               )}

               {rematchStatus === 'declined' && (
                 <div className="text-xs text-red-400 py-2">Rematch declined. Returning to lobby...</div>
               )}

               {rematchStatus === 'accepted' && (
                 <div className="text-xs text-green-400 animate-pulse py-2 font-bold uppercase tracking-widest">Generating new environment...</div>
               )}

               <button 
                 onClick={() => navigate('/lobby')}
                 className="w-full lc-button-secondary opacity-60 hover:opacity-100"
               >
                 Return to Lobby
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
