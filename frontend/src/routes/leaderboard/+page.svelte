<script>
    import { onMount, onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    import { isAuthenticated, api } from "../../stores/auth.js";

    export let data;
    export let params;

    let players = [];
    let loading = true;

    onMount(async () => {
        if (!$isAuthenticated) {
            goto("/login");
            return;
        }
        await loadLeaderboard();
    });

    async function loadLeaderboard() {
        loading = true;
        try {
            const res = await api("/lobby/leaderboard");
            if (res.ok) {
                players = await res.json();
            }
        } catch (e) {
            console.error("Failed to fetch leaderboard:", e);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Global Rankings - CodeBattle</title>
</svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <div class="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 fade-in">
        <div>
            <h1 class="text-3xl font-bold tracking-tight text-lc-text-primary">Hall of Fame</h1>
            <p class="mt-2 text-sm text-lc-text-secondary">The elite architects of the digital arena.</p>
        </div>
        
        <div class="flex items-center gap-4">
            <div class="lc-card px-4 py-2 flex items-center gap-3">
                <span class="text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Season 4</span>
                <span class="h-1 w-1 rounded-full bg-lc-orange"></span>
                <span class="text-xs font-bold text-lc-text-primary">Active</span>
            </div>
        </div>
    </div>

    <div class="lc-card overflow-hidden shadow-2xl fade-in" style="animation-delay: 0.1s">
        {#if loading}
            <div class="flex h-64 items-center justify-center">
                <div class="h-8 w-8 border-2 border-lc-orange border-t-transparent animate-spin rounded-full"></div>
            </div>
        {:else if players.length === 0}
            <div class="flex h-64 flex-col items-center justify-center text-center p-8">
                <div class="text-3xl mb-4">🏆</div>
                <p class="text-lc-text-secondary">No champions have emerged yet.</p>
                <button on:click={loadLeaderboard} class="mt-4 text-xs font-bold text-lc-orange uppercase tracking-widest hover:underline">Refresh Registry</button>
            </div>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-lc-border bg-lc-surface-elevated/30">
                            <th class="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Rank</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest">Coder</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest text-center">ELO Rating</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest text-center">Performance</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-lc-text-muted uppercase tracking-widest text-right">Ratio</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-lc-border">
                        {#each players as player, i}
                            <tr class="group hover:bg-white/[0.02] transition-colors">
                                <td class="px-6 py-5">
                                    <div class="flex items-center gap-3">
                                        {#if i === 0}
                                            <span class="text-xl">🥇</span>
                                        {:else if i === 1}
                                            <span class="text-xl">🥈</span>
                                        {:else if i === 2}
                                            <span class="text-xl">🥉</span>
                                        {:else}
                                            <span class="text-sm font-mono text-lc-text-muted">#{(i + 1).toString().padStart(2, '0')}</span>
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-6 py-5">
                                    <div class="flex items-center gap-3">
                                        <div class="h-9 w-9 rounded bg-lc-surface-elevated border border-lc-border flex items-center justify-center text-xs font-bold text-lc-orange">
                                            {player.username?.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <div class="text-sm font-bold text-lc-text-primary truncate max-w-[150px]">{player.username}</div>
                                            <div class="text-[9px] font-bold text-lc-text-muted uppercase tracking-tighter">Contributor</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-5 text-center">
                                    <span class="inline-flex items-center rounded-full bg-lc-orange/10 px-3 py-1 text-xs font-bold text-lc-orange border border-lc-orange/20">
                                        {player.rating}
                                    </span>
                                </td>
                                <td class="px-6 py-5">
                                    <div class="mx-auto max-w-[120px]">
                                        <div class="flex items-center justify-between text-[10px] font-bold text-lc-text-muted uppercase mb-1.5 font-mono">
                                            <span>{player.wins}W</span>
                                            <span>{player.losses}L</span>
                                        </div>
                                        <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-lc-surface-elevated">
                                            <div
                                                class="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                                style="width: {(player.wins / ((player.wins + player.losses) || 1)) * 100}%"
                                            ></div>
                                            <div
                                                class="h-full bg-red-500/50"
                                                style="width: {(player.losses / ((player.wins + player.losses) || 1)) * 100}%"
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-5 text-right">
                                    <span class="text-sm font-bold font-mono text-lc-text-primary">
                                        {((player.wins / ((player.wins + player.losses) || 1)) * 100).toFixed(1)}%
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>

    <div class="mt-8 text-center">
        <p class="text-[10px] text-lc-text-muted uppercase tracking-[0.2em]">Rankings updated in real-time based on competitive performance</p>
    </div>
</div>
