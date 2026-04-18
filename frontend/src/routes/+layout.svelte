<script>
    import '../app.css';
    import { user, isAuthenticated, fetchMe, logout } from '../stores/auth.js';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    onMount(async () => {
        await fetchMe();
    });

    async function handleLogout() {
        await logout();
        goto('/login');
    }

    $: currentPath = $page.url.pathname;
</script>

{#if $isAuthenticated}
<nav class="bg-paper-white border-b-4 border-kid-blue/20 px-6 py-4 mb-8">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
        <a href="/lobby" class="flex items-center gap-3 no-underline group">
            <div class="bg-kid-pink p-2 rounded-bubble-sm text-2xl group-hover:rotate-12 transition-transform shadow-bubble">⚔️</div>
            <span class="text-2xl font-[800] text-slate-800 tracking-tight">Arena<span class="text-kid-pink">.</span></span>
        </a>

        <div class="hidden md:flex items-center gap-2">
            <a href="/lobby" 
               class="px-5 py-2 rounded-full font-bold transition-all {currentPath === '/lobby' ? 'bg-kid-blue text-white shadow-bubble' : 'text-slate-500 hover:bg-slate-50'}">
                Lobby
            </a>
            <a href="/leaderboard" 
               class="px-5 py-2 rounded-full font-bold transition-all {currentPath === '/leaderboard' ? 'bg-kid-purple text-white shadow-bubble' : 'text-slate-500 hover:bg-slate-50'}">
                Leaderboard
            </a>
        </div>

        <div class="flex items-center gap-4">
            <div class="hidden sm:flex items-center gap-2 bg-kid-yellow/30 px-4 py-2 rounded-full border-2 border-kid-yellow/50">
                <span class="text-lg">⭐</span>
                <span class="font-bold text-slate-700">{$user?.rating || 1200}</span>
            </div>
            
            <div class="flex items-center gap-4">
                <span class="font-bold text-slate-600 hidden lg:inline">{$user?.username || 'Player'}</span>
                <button class="px-4 py-1.5 rounded-full border-2 border-slate-200 text-slate-400 font-bold hover:bg-slate-50 text-sm transition-all" on:click={handleLogout}>
                    Logout
                </button>
            </div>
        </div>
    </div>
</nav>
{/if}

<main class="pb-20">
    <slot />
</main>

