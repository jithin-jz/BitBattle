<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { isAuthenticated, api } from '../../stores/auth.js';
    import { connectToLobby } from '../../stores/lobby.js';

    let players = [];
    let loading = true;

    onMount(async () => {
        if (!$isAuthenticated) {
            goto('/login');
            return;
        }
        await loadLeaderboard();
        
        // Connect to real-time updates
        connectToLobby(() => {
            loadLeaderboard();
        });
    });

    async function loadLeaderboard() {
        if (players.length === 0) loading = true;
        try {
            const res = await api('/leaderboard?limit=50');
            if (res.ok) {
                players = await res.json();
            }
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
        }
        loading = false;
    }

    function getRankEmoji(index) {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return index + 1;
    }

    function getTierStyles(rating) {
        if (rating >= 2000) return 'bg-rose-100 text-rose-600 border-rose-200';
        if (rating >= 1600) return 'bg-amber-100 text-amber-600 border-amber-200';
        if (rating >= 1400) return 'bg-indigo-100 text-indigo-600 border-indigo-200';
        if (rating >= 1200) return 'bg-sky-100 text-sky-600 border-sky-200';
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }

    function getTierName(rating) {
        if (rating >= 2000) return 'Godlike';
        if (rating >= 1600) return 'Master';
        if (rating >= 1400) return 'Expert';
        if (rating >= 1200) return 'Warrior';
        return 'Rookie';
    }
</script>

<svelte:head>
    <title>Wall of Fame — Coding Arena</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-6 pb-20">
    <div class="text-center mb-16">
        <div class="inline-block bg-kid-pink/20 text-kid-pink px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest mb-4">
            Season 1 Rankings
        </div>
        <h1 class="text-6xl font-[800] text-slate-800 tracking-tighter mb-4">
            Wall of <span class="text-kid-purple">Fame</span> 🏆
        </h1>
        <p class="text-xl text-slate-500 font-medium">The greatest coding ninjas in the arena!</p>
    </div>

    {#if loading}
        <div class="flex flex-col items-center justify-center py-20">
            <div class="w-16 h-16 border-8 border-kid-blue/20 border-t-kid-blue rounded-full animate-spin mb-4"></div>
            <p class="font-bold text-slate-400">Summoning the champions...</p>
        </div>
    {:else if players.length === 0}
        <div class="bubbly-card flex flex-col items-center justify-center py-20 text-center">
            <span class="text-7xl mb-6">🏟️</span>
            <h2 class="text-3xl font-black text-slate-800 mb-2">The Arena is Empty!</h2>
            <p class="text-slate-500 font-medium mb-8">Be the first to claim a spot on the leaderboard.</p>
            <a href="/lobby" class="btn-kid btn-pink no-underline">Start Your Journey</a>
        </div>
    {:else}
        <!-- Top 3 Podium -->
        {#if players.length >= 3}
            <div class="flex flex-col lg:flex-row items-end justify-center gap-6 mb-20 px-4">
                <!-- 2nd Place -->
                <div class="flex flex-col items-center group order-2 lg:order-1">
                    <div class="bubbly-card !p-6 border-slate-200 mb-4 group-hover:-translate-y-2 transition-transform">
                        <div class="text-4xl mb-2 text-center">🥈</div>
                        <div class="font-black text-slate-700 truncate w-24 text-center">{players[1].username || 'Ninja'}</div>
                        <div class="text-2xl font-black text-slate-400 text-center">{players[1].rating}</div>
                    </div>
                    <div class="w-32 h-32 bg-slate-100 rounded-t-bubble-lg border-x-4 border-t-4 border-white shadow-bubble flex items-center justify-center">
                        <span class="text-4xl font-black text-slate-300">2</span>
                    </div>
                </div>

                <!-- 1st Place -->
                <div class="flex flex-col items-center group order-1 lg:order-2 scale-110 z-10">
                    <div class="text-4xl mb-2 float-anim">👑</div>
                    <div class="bubbly-card !p-8 border-kid-yellow/50 mb-4 group-hover:-translate-y-2 transition-transform shadow-kid-glow bg-white relative">
                        <div class="absolute -top-2 -right-2 bg-kid-yellow text-amber-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 border-white">#1</div>
                        <div class="text-5xl mb-2 text-center">🥇</div>
                        <div class="font-black text-slate-800 text-xl truncate w-32 text-center">{players[0].username || 'Champion'}</div>
                        <div class="text-3xl font-black text-kid-pink text-center">{players[0].rating}</div>
                    </div>
                    <div class="w-40 h-48 bg-gradient-to-b from-kid-yellow/40 to-kid-yellow/10 rounded-t-bubble-lg border-x-4 border-t-4 border-white shadow-kid-glow flex items-center justify-center">
                        <span class="text-6xl font-black text-kid-yellow">1</span>
                    </div>
                </div>

                <!-- 3rd Place -->
                <div class="flex flex-col items-center group order-3">
                    <div class="bubbly-card !p-6 border-kid-orange/30 mb-4 group-hover:-translate-y-2 transition-transform">
                        <div class="text-4xl mb-2 text-center">🥉</div>
                        <div class="font-black text-slate-700 truncate w-24 text-center">{players[2].username || 'Hero'}</div>
                        <div class="text-2xl font-black text-kid-orange text-center">{players[2].rating}</div>
                    </div>
                    <div class="w-32 h-20 bg-kid-orange/10 rounded-t-bubble-lg border-x-4 border-t-4 border-white shadow-bubble flex items-center justify-center">
                        <span class="text-4xl font-black text-kid-orange/30">3</span>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Rest of the Table -->
        <div class="bubbly-card !p-0 overflow-hidden border-slate-100">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50">
                            <th class="px-8 py-6 font-black text-slate-400 text-xs uppercase tracking-widest">Rank</th>
                            <th class="px-8 py-6 font-black text-slate-400 text-xs uppercase tracking-widest">Ninja</th>
                            <th class="px-8 py-6 font-black text-slate-400 text-xs uppercase tracking-widest text-center">Tier</th>
                            <th class="px-8 py-6 font-black text-slate-400 text-xs uppercase tracking-widest text-right">ELO</th>
                            <th class="px-8 py-6 font-black text-slate-400 text-xs uppercase tracking-widest text-right">W / L</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        {#each players as player, i}
                            <tr class="hover:bg-kid-blue/5 transition-colors group">
                                <td class="px-8 py-6">
                                    <div class="w-10 h-10 rounded-full flex items-center justify-center font-black {i < 3 ? 'text-2xl' : 'bg-slate-50 text-slate-400 text-sm'}">
                                        {getRankEmoji(i)}
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <span class="font-bold text-slate-700 group-hover:text-kid-blue transition-colors text-lg">
                                        {player.username || 'Anonymous Ninja'}
                                    </span>
                                </td>
                                <td class="px-8 py-6 text-center">
                                    <span class="px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-tighter border-2 {getTierStyles(player.rating)}">
                                        {getTierName(player.rating)}
                                    </span>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <span class="font-black text-xl text-slate-700 font-mono tracking-tighter">
                                        {player.rating}
                                    </span>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <div class="flex flex-col items-end">
                                        <div class="font-bold text-sm">
                                            <span class="text-kid-green">{player.wins}W</span>
                                            <span class="mx-1 text-slate-200">|</span>
                                            <span class="text-kid-pink">{player.losses}L</span>
                                        </div>
                                        <div class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                                            {Math.round((player.wins / ((player.wins + player.losses) || 1)) * 100)}% Win Rate
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div>

<style>
    :global(body) {
        background-color: #F8F9FF;
        background-image: 
            radial-gradient(#A3D9FF 1px, transparent 1px),
            radial-gradient(#FFB7D5 1px, transparent 1px);
        background-size: 80px 80px;
        background-position: 0 0, 40px 40px;
    }
</style>
