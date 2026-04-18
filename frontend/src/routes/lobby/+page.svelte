<script>
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import { user, isAuthenticated, api, fetchMe } from '../../stores/auth.js';
    import { matchState, resetMatch } from '../../stores/match.js';
    import { connectToLobby, onlineCount } from '../../stores/lobby.js';

    let searching = false;
    let searchTime = 0;
    let searchInterval;
    let dotAnim = '';
    let dotInterval;
    let unsubscribeMatch;

    onMount(async () => {
        if (!$isAuthenticated) {
            goto('/login');
            return;
        }
        await fetchMe();
        resetMatch();
        connectToLobby();
        
        unsubscribeMatch = matchState.subscribe(state => {
            if (state.status === 'matched' && state.matchId && searching) {
                searching = false;
                goto(`/battle/${state.matchId}`);
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
        dotAnim = '';

        searchInterval = setInterval(() => {
            searchTime++;
        }, 1000);

        dotInterval = setInterval(() => {
            dotAnim = dotAnim.length >= 3 ? '' : dotAnim + '.';
        }, 500);

        try {
            const res = await api('/match/join', { method: 'POST' });
            if (!res.ok) {
                const data = await res.json();
                alert(data.detail || 'Failed to join queue');
                cancelSearch();
            }
        } catch (e) {
            console.error('Join queue failed:', e);
            cancelSearch();
        }
    }

    async function cancelSearch() {
        searching = false;
        clearInterval(searchInterval);
        clearInterval(dotInterval);
        searchTime = 0;
        try {
            await api('/match/leave', { method: 'POST' });
        } catch (e) {
            console.error('Leave queue failed:', e);
        }
    }
</script>

<svelte:head>
    <title>Lobby — Coding Arena</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-6">
    <!-- Header Hero -->
    <div class="mb-12 text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-8 bg-gradient-to-r from-kid-blue/20 to-kid-purple/20 p-10 rounded-bubble-lg border-4 border-white shadow-kid-glow relative overflow-hidden">
        <div class="relative z-10">
            <h1 class="text-5xl font-[800] text-slate-800 mb-4 tracking-tighter">
                Hello, <span class="text-kid-pink">{$user?.username || 'Hero'}</span>! 👋
            </h1>
            <p class="text-xl text-slate-600 font-medium max-w-lg">
                Ready for some coding fun? Join a challenge and unlock epic rewards!
            </p>
        </div>
        
        <div class="flex items-center gap-6 relative z-10">
            <div class="bubbly-card flex flex-col items-center !p-6 border-kid-blue/30 scale-110 float-anim bg-white">
                <span class="text-4xl mb-2">💎</span>
                <span class="text-3xl font-black text-slate-800">{$user?.rating || 1200}</span>
                <span class="text-slate-400 font-bold text-xs uppercase tracking-widest">Global ELO</span>
            </div>
            
            <div class="flex flex-col gap-3">
                <div class="bg-paper-white px-6 py-4 rounded-bubble shadow-bubble flex items-center gap-4 border-2 border-slate-100">
                    <div class="w-3 h-3 bg-kid-green rounded-full pulse"></div>
                    <span class="font-bold text-slate-700">{$onlineCount} Players Online</span>
                </div>
            </div>
        </div>
        <!-- Decorative bubbles -->
        <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-kid-pink/10 rounded-full blur-2xl"></div>
        <div class="absolute -left-10 -top-10 w-40 h-40 bg-kid-blue/10 rounded-full blur-2xl"></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <!-- Main Matchmaking Card -->
        <div class="lg:col-span-2 bubbly-card !bg-kid-blue/5 border-kid-blue/20 !p-10 relative overflow-hidden group min-h-[400px] flex flex-col items-center justify-center">
            {#if !searching}
                <div class="text-8xl mb-6 transform group-hover:rotate-12 transition-transform duration-500">🎮</div>
                <h2 class="text-4xl font-black text-slate-800 mb-4">Quick Match</h2>
                <p class="text-lg text-slate-600 mb-8 max-w-sm text-center font-medium">
                    Test your speed against a random opponent of your skill level!
                </p>
                <button 
                    class="btn-kid btn-blue text-2xl !px-16 !py-6 hover:scale-105 active:scale-95" 
                    on:click={joinQueue}
                >
                    Start Game!
                </button>
                <div class="mt-8 flex items-center gap-4">
                    <span class="badge-kid bg-kid-yellow/30 text-kid-orange">Standard Mode</span>
                    <span class="badge-kid bg-kid-green/30 text-emerald-600">Double XP</span>
                </div>
            {:else}
                <div class="flex flex-col items-center text-center">
                    <div class="text-8xl mb-6 float-anim">🛰️</div>
                    <h2 class="text-4xl font-black text-slate-800 mb-4 tracking-tight">Searching{dotAnim}</h2>
                    <p class="text-2xl font-mono text-kid-blue font-bold mb-8 bg-white px-8 py-3 rounded-full shadow-bubble border-4 border-white">
                        {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
                    </p>
                    <button 
                        class="px-8 py-3 rounded-full bg-slate-100 text-slate-400 font-black hover:bg-slate-200 hover:text-slate-600 transition-all border-b-4 border-slate-200" 
                        on:click={cancelSearch}
                    >
                        Cancel Search
                    </button>
                </div>
            {/if}
        </div>

        <!-- Right Side: Stats & Rewards -->
        <div class="flex flex-col gap-6">
            <div class="bubbly-card !bg-kid-pink/5 border-kid-pink/20">
                <h3 class="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <span class="text-2xl">📊</span> Your Stats
                </h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between bg-white p-4 rounded-bubble-sm shadow-bubble border-2 border-slate-50">
                        <div class="flex items-center gap-3">
                            <span class="text-xl">🏆</span>
                            <span class="font-bold text-slate-600">Wins</span>
                        </div>
                        <span class="text-2xl font-black text-kid-pink">{$user?.wins || 0}</span>
                    </div>
                    <div class="flex items-center justify-between bg-white p-4 rounded-bubble-sm shadow-bubble border-2 border-slate-50 opacity-60">
                        <div class="flex items-center gap-3">
                            <span class="text-xl">⚔️</span>
                            <span class="font-bold text-slate-600">Losses</span>
                        </div>
                        <span class="text-2xl font-black text-slate-400">{$user?.losses || 0}</span>
                    </div>
                </div>
                
                <div class="mt-8 pt-6 border-t-2 border-dashed border-slate-200">
                    <div class="flex justify-between mb-2">
                        <span class="text-sm font-bold text-slate-400">WIN RATE</span>
                        <span class="text-sm font-bold text-kid-pink">
                            {($user?.wins / (($user?.wins + $user?.losses) || 1) * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div class="h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner">
                        <div class="h-full bg-kid-pink transition-all duration-1000" style="width: {($user?.wins / (($user?.wins + $user?.losses) || 1)) * 100}%"></div>
                    </div>
                </div>
            </div>

            <div class="bubbly-card !bg-kid-purple/5 border-kid-purple/20 flex flex-col items-center justify-center text-center p-8 group">
                <div class="text-5xl mb-4 transform group-hover:scale-125 transition-transform duration-500 cursor-help">🎒</div>
                <p class="font-black text-slate-800 text-lg">Daily Chest</p>
                <div class="mt-4 px-6 py-2 rounded-full bg-kid-purple border-b-4 border-purple-400 text-white font-black text-sm uppercase">
                    Coming Soon
                </div>
            </div>
        </div>
    </div>
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

    .pulse {
        box-shadow: 0 0 0 0 rgba(183, 255, 213, 0.7);
        animation: pulse-ring 2s infinite;
    }

    @keyframes pulse-ring {
        0% { box-shadow: 0 0 0 0 rgba(183, 255, 213, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(183, 255, 213, 0); }
        100% { box-shadow: 0 0 0 0 rgba(183, 255, 213, 0); }
    }
</style>
