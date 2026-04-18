<script>
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { user, isAuthenticated, api, accessToken } from '../../../stores/auth.js';
    import {
        matchState, ws, opponentStatus,
        connectToMatch, sendWSMessage, resetMatch
    } from '../../../stores/match.js';
    import { fetchMe } from '../../../stores/auth.js';

    let matchId = '';
    let editorContainer;
    let editorView;
    let code = '// Write your solution here\n\nfunction solution(input) {\n  // Your code\n}\n';
    let testResults = [];
    let submitting = false;
    let allPassed = false;

    $: matchId = $page.params.match_id;
    $: opponentName = $matchState.player1Id === $user?.id 
        ? $matchState.player2Username 
        : $matchState.player1Username;
    $: opponentAvatar = $matchState.player1Id === $user?.id
        ? $matchState.player2Avatar
        : $matchState.player1Avatar;

    // Derived stats
    $: passedCount = testResults.filter(t => t.passed).length;
    $: totalCount = testResults.length || 1;
    $: progressPercent = (passedCount / totalCount) * 100;

    onMount(async () => {
        if (!$isAuthenticated) {
            goto('/login');
            return;
        }

        if (!$ws || $ws.readyState !== WebSocket.OPEN) {
            let token = '';
            accessToken.subscribe(t => token = t)();
            connectToMatch(matchId, token);
        }

        await initEditor();
        await fetchMatchDetails();
    });

    async function fetchMatchDetails() {
        try {
            const res = await api(`/match/${matchId}`);
            if (res.ok) {
                const data = await res.json();
                matchState.update(s => ({
                    ...s,
                    status: data.status.toLowerCase(),
                    player1Id: data.player1_id,
                    player2Id: data.player2_id,
                    player1Username: data.player1_username,
                    player2Username: data.player2_username,
                    player1Avatar: data.player1_avatar,
                    player2Avatar: data.player2_avatar
                }));
            }
        } catch (e) {
            console.error('Failed to fetch match details:', e);
        }
    }

    onDestroy(() => {
        if (editorView) {
            editorView.destroy();
        }
    });

    async function initEditor() {
        const { EditorView, basicSetup } = await import('codemirror');
        const { javascript } = await import('@codemirror/lang-javascript');
        const { EditorState } = await import('@codemirror/state');

        if (!editorContainer) return;

        const state = EditorState.create({
            doc: code,
            extensions: [
                basicSetup,
                javascript(),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        code = update.state.doc.toString();
                        sendWSMessage({ type: 'code_update' });
                    }
                }),
                EditorView.theme({
                    '&': { fontSize: '15px', height: '100%', backgroundColor: '#ffffff' },
                    '.cm-scroller': { fontFamily: '"Fira Code", monospace' },
                    '.cm-gutters': { backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', color: '#94a3b8' },
                    '.cm-activeLineGutter': { backgroundColor: '#e2e8f0' },
                    '.cm-activeLine': { backgroundColor: '#f1f5f9' },
                }),
            ],
        });

        editorView = new EditorView({ state, parent: editorContainer });
    }

    function runTests() {
        const testCases = $matchState.testCases;
        if (!testCases || testCases.length === 0) return;

        testResults = [];
        allPassed = true;

        for (const tc of testCases) {
            try {
                const result = executeCode(code, tc.input);
                const passed = result.trim() === tc.expected_output.trim();
                if (!passed) allPassed = false;

                testResults = [...testResults, {
                    input: tc.input,
                    expected: tc.expected_output,
                    actual: result,
                    passed,
                    is_hidden: tc.is_hidden,
                }];
            } catch (e) {
                allPassed = false;
                testResults = [...testResults, {
                    input: tc.input,
                    expected: tc.expected_output,
                    actual: `Error: ${e.message}`,
                    passed: false,
                    is_hidden: tc.is_hidden,
                }];
            }
        }

        sendWSMessage({
            type: 'submission_result',
            status: allPassed ? 'passed' : 'attempted',
        });
    }

    function executeCode(userCode, input) {
        try {
            const fn = new Function('input', `
                ${userCode}
                if (typeof solution === 'function') return String(solution(input));
                if (typeof twoSum === 'function') {
                    const parts = input.split('\\n');
                    return JSON.stringify(twoSum(JSON.parse(parts[0]), parseInt(parts[1])));
                }
                return 'No recognized function found';
            `);
            return fn(input);
        } catch (e) {
            throw e;
        }
    }

    async function submitSolution() {
        if (!allPassed || submitting) return;
        submitting = true;
        try {
            const start = performance.now();
            const res = await api('/submit', {
                method: 'POST',
                body: JSON.stringify({
                    match_id: matchId,
                    code: code,
                    passed: true,
                    runtime: performance.now() - start,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.detail || 'Submission failed');
                fetchMatchDetails();
            }
        } catch (e) {
            console.error('Submit failed:', e);
        }
        submitting = false;
    }

    function formatTimer(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    async function goBack() {
        await fetchMe();
        resetMatch();
        goto('/lobby');
    }
</script>

<div class="h-screen flex flex-col bg-paper-bg overflow-hidden">
    <!-- Game Top Header (Players & Health) -->
    <div class="bg-paper-white border-b-4 border-slate-100 p-4 flex items-center justify-between gap-8 z-10">
        <!-- Player -->
        <div class="flex-1 flex items-center gap-4">
            <div class="w-16 h-16 rounded-bubble bg-kid-pink border-4 border-white shadow-bubble flex items-center justify-center text-3xl">👤</div>
            <div class="flex-1">
                <div class="flex justify-between items-end mb-1">
                    <span class="font-black text-slate-700">{$user?.username || 'You'}</span>
                    <span class="text-xs font-bold text-slate-400">{passedCount}/{testResults.length || 0} QUESTS</span>
                </div>
                <div class="h-6 bg-slate-100 rounded-full border-2 border-white shadow-inner overflow-hidden">
                    <div class="h-full bg-kid-pink transition-all duration-500 shadow-kid-glow" style="width: {progressPercent}%"></div>
                </div>
            </div>
        </div>

        <!-- Timer Center -->
        <div class="flex flex-col items-center">
            <div class="text-xs font-black text-slate-300 uppercase tracking-widest mb-1">Time Left</div>
            <div class="bg-slate-800 text-kid-yellow px-6 py-2 rounded-bubble font-black text-3xl shadow-bubble tabular-nums border-b-4 border-slate-900 
                {$matchState.timeRemaining < 60 ? 'animate-pulse text-red-400' : ''}">
                {formatTimer($matchState.timeRemaining)}
            </div>
        </div>

        <!-- Opponent -->
        <div class="flex-1 flex items-center gap-4 flex-row-reverse">
            <div class="w-16 h-16 rounded-bubble bg-kid-blue border-4 border-white shadow-bubble flex items-center justify-center text-3xl">🦹</div>
            <div class="flex-1 text-right">
                <div class="flex justify-between items-end mb-1 flex-row-reverse">
                    <span class="font-black text-slate-700 truncate max-w-[150px]">{opponentName || 'Enemy'}</span>
                    <span class="text-xs font-bold text-slate-400">
                        { $opponentStatus === 'typing' ? 'WORKING...' : $opponentStatus.toUpperCase() }
                    </span>
                </div>
                <div class="h-6 bg-slate-100 rounded-full border-2 border-white shadow-inner overflow-hidden">
                    <div class="h-full bg-kid-blue transition-all duration-500 opacity-50" 
                         style="width: {$opponentStatus === 'passed' ? '100%' : '30%'}"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Game Area -->
    <div class="flex-1 flex overflow-hidden p-4 gap-4">
        <!-- Left: Problem (The Quest) -->
        <div class="w-1/3 flex flex-col gap-4">
            <div class="bubbly-card flex-1 overflow-hidden flex flex-col p-0">
                <div class="bg-kid-yellow px-6 py-3 font-black text-amber-800 border-b-4 border-amber-200 flex items-center justify-between">
                    <span>📜 THE CHALLENGE</span>
                    <span class="text-xs bg-white/50 px-2 py-0.5 rounded-full">{$matchState.problem?.difficulty || 'Normal'}</span>
                </div>
                <div class="flex-1 overflow-y-auto p-6 scrollbar-hide text-slate-700 font-medium leading-relaxed prose prose-slate">
                    {#if $matchState.problem}
                        <h2 class="text-2xl font-black mb-4">{$matchState.problem.title}</h2>
                        <div class="problem-text">
                            {@html $matchState.problem.description
                                .replace(/\n/g, '<br>')
                                .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-slate-800 text-white p-4 rounded-lg my-4"><code>$2</code></pre>')
                                .replace(/`([^`]+)`/g, '<code class="bg-kid-yellow/30 px-1 rounded">$1</code>')
                            }
                        </div>
                    {:else}
                        <div class="flex flex-col items-center justify-center h-full text-slate-300">
                            <div class="text-6xl mb-4">⌛</div>
                            <p class="font-bold">Waiting for Scroll...</p>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Console / Tests -->
            <div class="h-1/3 bubbly-card p-0 flex flex-col overflow-hidden">
                <div class="bg-slate-800 text-slate-400 px-6 py-2 text-xs font-black border-b-4 border-slate-900">
                    🖥️ CONSOLE OUTPUT
                </div>
                <div class="flex-1 overflow-y-auto p-4 font-mono text-sm bg-slate-900 text-kid-green">
                    {#if testResults.length > 0}
                        {#each testResults as res, i}
                            <div class="mb-2 {res.passed ? 'text-emerald-400' : 'text-rose-400'}">
                                > Test #{i+1}: {res.passed ? 'PASSED! ✨' : 'FAILED! 💥'}
                                {#if !res.passed}
                                    <div class="ml-4 text-xs text-slate-500">Expected: {res.expected} | Got: {res.actual}</div>
                                {/if}
                            </div>
                        {/each}
                    {:else}
                        <div class="opacity-50">> Ready for execution...</div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Right: Editor (The Keyboard) -->
        <div class="flex-1 flex flex-col gap-4">
            <div class="bubbly-card flex-1 !p-0 border-kid-blue/20 overflow-hidden relative group">
                <div class="absolute inset-0 border-4 border-transparent group-focus-within:border-kid-blue/30 transition-colors pointer-events-none z-10 rounded-bubble"></div>
                <div bind:this={editorContainer} class="h-full"></div>
            </div>

            <!-- Actions Bar -->
            <div class="flex gap-4">
                <button 
                    class="btn-kid btn-yellow flex-1 text-xl flex items-center justify-center gap-2 group"
                    on:click={runTests}
                    disabled={$matchState.status !== 'started' || submitting}
                >
                    <span class="group-hover:rotate-12 transition-transform">⚡</span> Run Test!
                </button>
                <button 
                    class="btn-kid btn-blue flex-1 text-xl flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 group"
                    on:click={submitSolution}
                    disabled={$matchState.status !== 'started' || !allPassed || submitting}
                >
                    {#if submitting}
                        <span>🌀</span> Sending...
                    {:else}
                        <span class="group-hover:-translate-y-1 transition-transform">🚀</span> SEND IT!
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <!-- Match End Overlay -->
    {#if $matchState.status === 'finished'}
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
            <div class="bubbly-card max-w-md w-full text-center p-12 animate-slide-up bg-white">
                {#if $matchState.winnerId === $user?.id}
                    <div class="text-8xl mb-6 float-anim">🏆</div>
                    <h1 class="text-4xl font-black text-slate-800 mb-2">VICTORY!</h1>
                    <p class="text-slate-500 font-bold mb-8">You out-coded the opponent! +32 ELO</p>
                {:else if $matchState.winnerId}
                    <div class="text-8xl mb-6">💀</div>
                    <h1 class="text-4xl font-black text-rose-500 mb-2">DEFEAT</h1>
                    <p class="text-slate-500 font-bold mb-8">Almost had it! Keep practicing. -15 ELO</p>
                {:else}
                    <div class="text-8xl mb-6">⏱️</div>
                    <h1 class="text-4xl font-black text-amber-500 mb-2">TIME'S UP</h1>
                    <p class="text-slate-500 font-bold mb-8">It's a draw! No ELO changed.</p>
                {/if}
                
                <button class="btn-kid btn-pink w-full text-xl" on:click={goBack}>
                    BACK TO BASE
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    :global(.cm-editor) {
        outline: none !important;
    }
    
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }

    .float-anim {
        animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
</style>
