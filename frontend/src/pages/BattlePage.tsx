import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { setMatchData, updateTimer, setOpponentStatus, resetBattle } from '../features/battle/battleSlice';
import { TestResult } from '../shared/types';
import { api } from '../shared/api';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BattlePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: battle, opponentStatus } = useSelector((state: RootState) => state.battle);
  const { user, accessToken } = useSelector((state: RootState) => state.auth);

  const [code, setCode] = useState("// Write your solution here\n\nfunction solution(input) {\n  // Your code\n}\n");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'problem' | 'output'>('problem');
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
          break;
        case 'timer_update':
          dispatch(updateTimer(msg.remaining));
          break;
        case 'match_end':
          dispatch(setMatchData({ status: 'finished', winnerId: msg.winner_id || null }));
          break;
        case 'opponent_submission':
          dispatch(setOpponentStatus(msg.status));
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
    const allPassed = results.length > 0 && results.every(r => r.passed);
    const runtime = Math.round(performance.now() - startTime);

    if (matchId) {
       try {
           await api('/submit', {
               method: 'POST',
               body: JSON.stringify({
                   match_id: matchId,
                   code: code,
                   passed: allPassed,
                   runtime: runtime
               })
           });
       } catch (e) {
           console.error('Failed to submit result', e);
       }
    }
    
    setSubmitting(false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-grow flex flex-col bg-lc-bg overflow-hidden">
      <div className="h-12 border-b border-lc-border bg-lc-surface flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Clock:</span>
            <span className={`text-sm font-mono font-bold ${battle.timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-lc-orange'}`}>
              {formatTimer(battle.timeRemaining)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {opponentStatus && opponentStatus !== 'waiting' && opponentStatus !== 'disconnected' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-lc-surface-elevated/50 border border-lc-border rounded text-[10px] uppercase font-bold text-lc-text-secondary tracking-widest">
                 <div className="h-1.5 w-1.5 rounded-full bg-lc-orange animate-pulse"></div>
                 Opponent: {opponentStatus}
              </div>
           )}
           {battle.status === 'finished' && (
             <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                Match Complete{battle.winnerId === user?.id ? ' (Victory)' : ' (Defeat)'}
             </div>
           )}
        </div>
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        <div className="flex flex-col border-r border-lc-border bg-lc-surface-elevated/20 overflow-hidden">
          <div className="p-6 overflow-y-auto">
            <h1 className="text-2xl font-bold text-lc-text-primary mb-6">{battle.problem?.title || 'Loading problem...'}</h1>
            <div className="prose prose-invert prose-orange max-w-none text-sm text-lc-text-secondary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {battle.problem?.description || 'Waiting for match coordinates...'}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-lc-bg overflow-hidden relative">
          <div className="flex-grow">
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
               <button onClick={runTests} className="ml-auto flex items-center gap-1.5 text-lc-orange hover:text-orange-400 transition-colors uppercase font-bold text-[10px]">
                 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                 Run Code
               </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-1 bg-[#1e1e1e] text-[#cccccc]">
              {testResults.length === 0 ? (
                <div className="text-[#cccccc]/50">
                  <div className="text-green-500 mb-2">CodeBattle Arena Integrated Terminal v1.0.0</div>
                  <div>$ Waiting for execution...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-green-500 mb-2">CodeBattle Arena Integrated Terminal v1.0.0</div>
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
    </div>
  );
}
