<script>
    import { onMount, onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    import { user, isAuthenticated, api, fetchMe } from "../../stores/auth.js";
    import { matchState, resetMatch } from "../../stores/match.js";
    import { connectToLobby, onlineCount } from "../../stores/lobby.js";

    export let data;
    export let params;

    let searching = false;
    let searchTime = 0;
    let searchInterval;
    let dotAnim = "";
    let dotInterval;
    let unsubscribeMatch;
    let navigatingToMatch = false;

    // Matches for list view
    let demoMatches = [
        { id: "match-882", creator: "ByteBard", status: "WAITING", difficulty: "Medium", tags: ["Greedy", "DP"] },
        { id: "match-129", creator: "NullPointer", status: "WAITING", difficulty: "Easy", tags: ["Array", "Hash Table"] },
        { id: "match-904", creator: "CodeWizard", status: "IN_PROGRESS", difficulty: "Hard", tags: ["Graph", "BFS"] }
    ];

    onMount(async () => {
        if (!$isAuthenticated) {
            goto("/login");
            return;
        }
        await fetchMe();
        resetMatch();
        connectToLobby();

        unsubscribeMatch = matchState.subscribe((state) => {
            if (state.status === "matched" && state.matchId) {
                navigateToMatch(state.matchId);
            }
        });
    });

    onDestroy(() => {
        clearInterval(searchInterval);
        clearInterval(dotInterval);
        if (unsubscribeMatch) unsubscribeMatch();
    });

    async function joinQueue() {
        searching = true;
        searchTime = 0;
        dotAnim = "";

        searchInterval = setInterval(() => {
            searchTime++;
        }, 1000);

        dotInterval = setInterval(() => {
            dotAnim = dotAnim.length >= 3 ? "" : dotAnim + ".";
        }, 500);

        try {
            const res = await api("/match/join", { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                console.error(data.detail || "Failed to join queue");
                cancelSearch();
                return;
            }

            const data = await res.json();
            if (data.status === "matched") {
                navigateToMatch(data.match_id);
            }
        } catch (e) {
            console.error("Matchmaking request failed:", e);
            cancelSearch();
        }
    }

    function navigateToMatch(matchId) {
        if (!matchId || navigatingToMatch) return;
        navigatingToMatch = true;
        searching = false;
        clearInterval(searchInterval);
        clearInterval(dotInterval);
        goto(`/battle/${matchId}`);
    }

    async function cancelSearch() {
        searching = false;
        clearInterval(searchInterval);
        clearInterval(dotInterval);
        searchTime = 0;
        try {
            await api("/match/leave", { method: "POST" });
        } catch (e) {
            console.error("Failed to cancel matchmaking:", e);
        }
    }
</script>

<svelte:head>
    <title>Arena - CodeBattle</title>
</svelte:head>

<div class="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8 flex-grow">
    <div class="grid grid-cols-1 gap-12 lg:grid-cols-12 flex-grow">
        
        <!-- Main Area: Match Listings -->
        <main class="lg:col-span-8 space-y-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold tracking-tight text-lc-text-primary mb-2">Battle Ground</h1>
                    <p class="text-sm text-lc-text-secondary">Join an active session or initiate a new duel</p>
                </div>
                
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 group">
                        <span class="text-xs font-semibold text-lc-text-muted transition-colors group-hover:text-lc-text-primary uppercase tracking-wider">Online:</span>
                        <span class="text-xs font-bold text-green-500">{$onlineCount}</span>
                    </div>
                </div>
            </div>

            <!-- New Match Promotion -->
            <div class="lc-card p-1 border-lc-orange/20 bg-linear-to-br from-lc-orange/5 to-transparent shadow-lg shadow-lc-orange/5">
                <div class="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                        <div class="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-lc-orange/10 text-lc-orange text-[10px] font-bold uppercase tracking-wider mb-3">Featured Mode</div>
                        <h2 class="text-xl font-bold text-lc-text-primary mb-2">Automated Matchmaking</h2>
                        <p class="text-sm text-lc-text-secondary max-w-sm">Connect with a challenger near your ELO ranking and compete in a dynamic environment.</p>
                    </div>
                    
                    {#if !searching}
                        <button
                            on:click={joinQueue}
                            class="lc-button-primary px-10 py-4 text-base shadow-xl"
                        >
                            Find a Match
                        </button>
                    {:else}
                        <div class="flex flex-col items-center gap-4">
                            <div class="flex items-center gap-1.5 py-4">
                                <span class="h-2 w-2 bg-lc-orange rounded-full animate-pulse"></span>
                                <span class="text-sm font-bold text-lc-orange uppercase tracking-widest">Searching Sector{dotAnim}</span>
                            </div>
                            <button
                                on:click={cancelSearch}
                                class="text-xs font-bold text-lc-text-muted hover:text-red-500 transition-colors"
                            >
                                Stop Matchmaking ({Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, "0")})
                            </button>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- List View -->
            <div class="space-y-4">
                <div class="flex items-center justify-between text-xs font-bold text-lc-text-muted uppercase tracking-widest px-4">
                    <span>Active Sessions</span>
                    <div class="flex items-center gap-8">
                        <span class="w-20 text-center">Status</span>
                        <span class="w-20 text-center">Action</span>
                    </div>
                </div>

                <div class="space-y-3">
                    {#each demoMatches as match}
                        <div class="lc-card p-4 hover:border-lc-orange/40 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div class="flex items-center gap-4 flex-grow">
                                <div class="h-12 w-12 rounded bg-lc-surface-elevated flex items-center justify-center text-xl font-bold border border-lc-border">
                                    {match.creator.slice(0, 1)}
                                </div>
                                <div>
                                    <div class="flex items-center gap-3 mb-1">
                                        <h3 class="font-bold text-lc-text-primary uppercase tracking-tight">{match.creator}'s Session</h3>
                                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-lc-surface-elevated text-lc-text-secondary font-bold">{match.id}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        {#each match.tags as tag}
                                            <span class="text-[9px] text-lc-text-muted uppercase font-bold tracking-widest px-2 py-0.5 bg-zinc-800/40 rounded">{tag}</span>
                                        {/each}
                                    </div>
                                </div>
                            </div>

                            <div class="flex items-center gap-8">
                                <div class="w-20 flex justify-center">
                                    <span class="text-[10px] font-bold uppercase tracking-widest {match.status === 'WAITING' ? 'text-amber-500' : 'text-green-500'}">
                                        {match.status}
                                    </span>
                                </div>
                                <div class="w-20 flex justify-center">
                                    <button
                                        class="text-xs font-bold text-lc-orange hover:text-white transition-colors disabled:opacity-30"
                                        disabled={match.status !== 'WAITING'}
                                    >
                                        JOIN
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </main>

        <!-- Sidebar: Stats & Info -->
        <aside class="lg:col-span-4 space-y-6">
            <div class="lc-card p-6 divide-y divide-lc-border">
                <div class="pb-6">
                    <h3 class="text-xs font-bold uppercase tracking-widest text-lc-text-muted mb-6">Your Performance</h3>
                    <div class="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div class="text-xl font-bold text-lc-text-primary">{$user?.rating || 1200}</div>
                            <div class="text-[9px] font-bold text-lc-text-muted uppercase mt-1">Rating</div>
                        </div>
                        <div>
                            <div class="text-xl font-bold text-lc-orange">{$user?.wins || 0}</div>
                            <div class="text-[9px] font-bold text-lc-text-muted uppercase mt-1">Wins</div>
                        </div>
                        <div>
                            <div class="text-xl font-bold text-lc-text-secondary">{$user?.losses || 0}</div>
                            <div class="text-[9px] font-bold text-lc-text-muted uppercase mt-1">Losses</div>
                        </div>
                    </div>
                </div>
                
                <div class="py-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-lc-text-muted uppercase">Global Rank</span>
                        <span class="text-xs font-bold text-lc-text-primary">#12,094</span>
                    </div>
                    <div class="w-full h-1.5 bg-lc-surface-elevated rounded-full overflow-hidden">
                        <div class="h-full bg-lc-orange" style="width: 45%"></div>
                    </div>
                </div>

                <div class="pt-6">
                    <h4 class="text-xs font-bold text-lc-text-secondary mb-3">Recent Activity</h4>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="text-lc-text-muted">Won vs User_882</span>
                            <span class="text-green-500 font-bold">+14 XP</span>
                        </div>
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="text-lc-text-muted">Lost vs Pro_Coder</span>
                            <span class="text-red-500 font-bold">-12 XP</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rules / Tips -->
            <div class="lc-card p-6 bg-linear-to-b from-lc-surface to-transparent">
                <h3 class="text-xs font-bold uppercase tracking-widest text-lc-text-primary mb-4">Guidelines</h3>
                <ul class="space-y-3">
                    <li class="flex items-start gap-3">
                        <div class="h-4 w-4 rounded-full bg-lc-orange/20 flex items-center justify-center text-[10px] text-lc-orange font-bold">1</div>
                        <p class="text-xs text-lc-text-secondary leading-relaxed">Each duel lasts 30 minutes. Be efficient with your code.</p>
                    </li>
                    <li class="flex items-start gap-3">
                        <div class="h-4 w-4 rounded-full bg-lc-orange/20 flex items-center justify-center text-[10px] text-lc-orange font-bold">2</div>
                        <p class="text-xs text-lc-text-secondary leading-relaxed">Submissions are evaluated on correct output and time complexity.</p>
                    </li>
                </ul>
            </div>
        </aside>
    </div>
</div>
