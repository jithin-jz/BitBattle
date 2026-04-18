<script>
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import {
        user,
        isAuthenticated,
        api,
        accessToken,
    } from "../../../stores/auth.js";
    import { ws, matchState, opponentStatus, connectToMatch, sendWSMessage, resetMatch } from "../../../stores/match.js";

    export let data;
    export let params;

    import { fetchMe } from "../../../stores/auth.js";
    import CodeEditor from "../../../components/battle/CodeEditor.svelte";
    import TestRunner from "../../../components/battle/TestRunner.svelte";
    import OpponentStatus from "../../../components/battle/OpponentStatus.svelte";
    import ProblemStatement from "../../../components/battle/ProblemStatement.svelte";

    let matchId = "";
    let code =
        "// Write your solution here\n\nfunction solution(input) {\n  // Your code\n}\n";
    let testResults = [];
    let submitting = false;
    let allPassed = false;
    let isTestsRunning = false;

    $: matchId = $page.params.match_id;
    $: opponentName =
        $matchState.player1Id === $user?.id
            ? $matchState.player2Username
            : $matchState.player1Username;
    $: opponentAvatar =
        $matchState.player1Id === $user?.id
            ? $matchState.player2Avatar
            : $matchState.player1Avatar;

    $: passedCount = testResults.filter((t) => t.passed).length;
    $: totalCount = testResults.length || 1;

    onMount(async () => {
        if (!$isAuthenticated) {
            goto("/login");
            return;
        }

        if (!$ws || $ws.readyState !== WebSocket.OPEN) {
            let token = "";
            accessToken.subscribe((t) => (token = t))();
            connectToMatch(matchId, token);
        }

        await fetchMatchDetails();
    });

    async function fetchMatchDetails() {
        try {
            const res = await api(`/match/${matchId}`);
            if (res.ok) {
                const data = await res.json();
                matchState.update((s) => ({
                    ...s,
                    status: data.status.toLowerCase(),
                    player1Id: data.player1_id,
                    player2Id: data.player2_id,
                    player1Username: data.player1_username,
                    player2Username: data.player2_username,
                    player1Avatar: data.player1_avatar,
                    player2Avatar: data.player2_avatar,
                    testCases: data.test_cases || []
                }));
            }
        } catch (e) {
            console.error("Failed to fetch match details:", e);
        }
    }

    function handleCodeChange() {
        sendWSMessage({ type: "code_update" });
    }

    function runTests() {
        const testCases = $matchState.testCases;
        if (!testCases || testCases.length === 0) return;

        isTestsRunning = true;
        testResults = [];
        allPassed = true;

        for (const tc of testCases) {
            try {
                const result = executeCode(code, tc.input);
                const passed = result.trim() === tc.expected_output.trim();
                if (!passed) allPassed = false;

                testResults = [
                    ...testResults,
                    {
                        input: tc.input,
                        expected: tc.expected_output,
                        actual: result,
                        passed,
                        is_hidden: tc.is_hidden,
                    },
                ];
            } catch (e) {
                allPassed = false;
                testResults = [
                    ...testResults,
                    {
                        input: tc.input,
                        expected: tc.expected_output,
                        actual: `Error: ${e.message}`,
                        passed: false,
                        is_hidden: tc.is_hidden,
                    },
                ];
            }
        }

        isTestsRunning = false;

        sendWSMessage({
            type: "submission_result",
            status: allPassed ? "passed" : "attempted",
        });
    }

    function executeCode(userCode, input) {
        try {
            const fn = new Function(
                "input",
                `
                ${userCode}
                if (typeof solution === 'function') return String(solution(input));
                if (typeof twoSum === 'function') {
                    const parts = input.split('\\n');
                    return JSON.stringify(twoSum(JSON.parse(parts[0]), parseInt(parts[1])));
                }
                return 'No recognized function found';
            `,
            );
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
            const res = await api("/submit", {
                method: "POST",
                body: JSON.stringify({
                    match_id: matchId,
                    code: code,
                    passed: true,
                    runtime: performance.now() - start,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.detail || "Submission failed");
                fetchMatchDetails();
            }
        } catch (e) {
            console.error("Submit failed:", e);
        }
        submitting = false;
    }

    function formatTimer(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    async function goBack() {
        await fetchMe();
        resetMatch();
        goto("/lobby");
    }
</script>

<svelte:head>
    <title>Battle - CodeBattle</title>
</svelte:head>

<div class="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-lc-bg select-none">
    <!-- Battle Header -->
    <header class="h-14 border-b border-lc-border bg-lc-surface flex items-center justify-between px-6 z-40">
        <div class="flex items-center gap-6">
            <button on:click={goBack} class="text-lc-text-muted hover:text-lc-text-primary transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Exit Arena
            </button>
            <div class="h-6 w-[1px] bg-lc-border mx-2"></div>
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Match ID:</span>
                    <span class="text-xs font-mono font-bold text-lc-orange">{matchId.slice(0, 8)}</span>
                </div>
            </div>
        </div>

        <div class="flex flex-col items-center">
            <div class="flex items-center gap-3 bg-lc-bg px-4 py-1.5 rounded-full border border-lc-border">
                <div class="text-xs font-mono font-bold {($matchState.timeRemaining || 0) < 60 ? 'text-red-500 animate-pulse' : 'text-lc-text-primary'}">
                    {formatTimer($matchState.timeRemaining || 0)}
                </div>
                <div class="h-3 w-[1px] bg-lc-border"></div>
                <div class="text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Time Remaining</div>
            </div>
        </div>

        <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
                <div class="text-right">
                    <div class="text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Contestant</div>
                    <div class="text-xs font-bold text-lc-text-primary">{opponentName || 'Searching...'}</div>
                </div>
                <div class="h-8 w-8 rounded bg-lc-surface-elevated border border-lc-border flex items-center justify-center font-bold text-lc-orange">
                    {(opponentName || 'OP').slice(0, 1).toUpperCase()}
                </div>
            </div>
        </div>
    </header>

    <!-- Main Workspace -->
    <div class="flex-grow flex p-1 gap-1 overflow-hidden">
        <!-- Problem & Test Results (Left Column) -->
        <div class="w-1/3 flex flex-col gap-1 overflow-hidden">
            <div class="flex-grow lc-card overflow-hidden flex flex-col">
                <div class="h-10 border-b border-lc-border bg-lc-surface flex items-center px-4">
                    <span class="text-[10px] font-bold text-lc-text-primary uppercase tracking-widest">Problem Description</span>
                </div>
                <div class="flex-grow overflow-y-auto p-4 custom-scrollbar">
                    <ProblemStatement problem={$matchState.problem} />
                </div>
            </div>

            <div class="h-1/3 lc-card overflow-hidden flex flex-col">
                <div class="h-10 border-b border-lc-border bg-lc-surface flex items-center justify-between px-4">
                    <span class="text-[10px] font-bold text-lc-text-primary uppercase tracking-widest">Test Results</span>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-green-500 uppercase tracking-widest">{passedCount} / {totalCount} Passed</span>
                    </div>
                </div>
                <div class="flex-grow overflow-y-auto p-4 custom-scrollbar bg-black/20">
                    <TestRunner
                        {testResults}
                        isRunning={isTestsRunning}
                        {passedCount}
                        {totalCount}
                    />
                </div>
            </div>
        </div>

        <!-- Code Editor & Actions (Right Column) -->
        <div class="flex-grow flex flex-col gap-1 overflow-hidden">
            <div class="flex-grow lc-card overflow-hidden flex flex-col">
                <div class="h-10 border-b border-lc-border bg-lc-surface flex items-center justify-between px-4">
                    <div class="flex items-center gap-4">
                        <span class="text-[10px] font-bold text-lc-text-primary uppercase tracking-widest">Solution.js</span>
                    </div>
                    <div class="flex items-center gap-2">
                         <span class="text-[9px] text-lc-text-muted uppercase font-bold tracking-widest">{$opponentStatus === "typing" ? "Opponent is typing..." : ""}</span>
                    </div>
                </div>
                <div class="flex-grow relative bg-lc-surface">
                    <CodeEditor
                        bind:code
                        onCodeChange={handleCodeChange}
                    />
                </div>
                <div class="h-14 border-t border-lc-border bg-lc-surface flex items-center justify-end px-4 gap-3">
                    <button
                        on:click={runTests}
                        disabled={$matchState.status !== "started" || submitting}
                        class="lc-button-secondary py-2 px-6 text-xs font-bold uppercase tracking-widest hover:bg-lc-border transition-colors border-none"
                    >
                        Run Code
                    </button>
                    <button
                        on:click={submitSolution}
                        disabled={$matchState.status !== "started" || !allPassed || submitting}
                        class="lc-button-primary py-2 px-6 text-xs font-bold uppercase tracking-widest bg-green-600 hover:bg-green-500 text-white transition-colors border-none"
                    >
                        {submitting ? "Submitting..." : "Submit Solution"}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Final Result Overlay -->
    {#if $matchState.status === "finished"}
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 fade-in">
            <div class="lc-card w-full max-w-lg p-10 text-center shadow-2xl border-2 {$matchState.winnerId === $user?.id ? 'border-green-500/50' : 'border-red-500/50'}">
                <div class="text-[10px] font-bold uppercase tracking-[0.25em] text-lc-text-muted mb-6">Battle Conclusion</div>
                
                {#if $matchState.winnerId === $user?.id}
                    <div class="text-6xl mb-6">🏆</div>
                    <h2 class="text-4xl font-extrabold text-white mb-2">Victory</h2>
                    <p class="text-lc-text-secondary text-sm mb-10">You have outperformed your opponent. Your rating has increased.</p>
                {:else if $matchState.winnerId}
                    <div class="text-6xl mb-6">💀</div>
                    <h2 class="text-4xl font-extrabold text-white mb-2">Defeat</h2>
                    <p class="text-lc-text-secondary text-sm mb-10">Opponent secured the solution first. Recalibrate and try again.</p>
                {:else}
                    <div class="text-6xl mb-6">⌛</div>
                    <h2 class="text-4xl font-extrabold text-white mb-2">Draw</h2>
                    <p class="text-lc-text-secondary text-sm mb-10">Execution window closed without a definitive victor.</p>
                {/if}

                <button
                    on:click={goBack}
                    class="lc-button-primary w-full py-4 text-sm font-bold uppercase tracking-widest"
                >
                    Return to Lobby
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 10px;
    }
</style>
