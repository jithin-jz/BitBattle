<script>
    import { page } from "$app/stores";
    import { user, isAuthenticated, logout } from "../stores/auth.js";
    import "../app.css";

    export let data;
    export let params;

    let currentPath = "";
    $: currentPath = $page.url.pathname;

    function handleLogout() {
        logout();
    }
</script>

<div class="min-h-screen bg-lc-bg text-lc-text-primary flex flex-col font-sans">
    {#if $isAuthenticated}
        <header class="h-14 border-b border-lc-border bg-lc-surface sticky top-0 z-50 px-4">
            <div class="mx-auto flex h-full max-w-[1600px] items-center justify-between">
                <div class="flex items-center gap-8">
                    <a href="/lobby" class="flex items-center gap-2">
                        <div class="w-2 h-8 bg-lc-orange rounded-full"></div>
                        <span class="text-xl font-bold tracking-tight">CodeBattle</span>
                    </a>

                    <nav class="hidden md:flex items-center gap-1">
                        <a
                            href="/lobby"
                            class="px-4 py-2 text-sm font-medium transition-colors hover:text-lc-orange {currentPath === '/lobby' ? 'text-lc-orange' : 'text-lc-text-secondary'}"
                        >
                            Arena
                        </a>
                        <a
                            href="/leaderboard"
                            class="px-4 py-2 text-sm font-medium transition-colors hover:text-lc-orange {currentPath === '/leaderboard' ? 'text-lc-orange' : 'text-lc-text-secondary'}"
                        >
                            Leaderboard
                        </a>
                    </nav>
                </div>

                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 px-3 py-1 bg-lc-surface-elevated rounded-full border border-lc-border">
                        <span class="text-[10px] font-bold text-lc-orange uppercase">ELO</span>
                        <span class="text-sm font-bold">{$user?.rating || 1200}</span>
                    </div>

                    <div class="h-8 w-[1px] bg-lc-border mx-2"></div>

                    <div class="flex items-center gap-3">
                        <div class="text-right hidden sm:block">
                            <div class="text-xs font-bold leading-none">{$user?.username || 'Guest'}</div>
                        </div>
                        <button
                            on:click={handleLogout}
                            class="text-xs font-medium text-lc-text-muted hover:text-lc-orange transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    {/if}

    <main class="flex-grow flex flex-col">
        <slot />
    </main>

    <footer class="border-t border-lc-border bg-lc-surface/50 py-6 px-4">
        <div class="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-lc-text-muted">
            <p>© 2026 CodeBattle Arena. All rights reserved.</p>
            <div class="flex items-center gap-6">
                <a href="#" class="hover:text-lc-text-secondary transition-colors">Privacy Policy</a>
                <a href="#" class="hover:text-lc-text-secondary transition-colors">Terms of Service</a>
                <a href="#" class="hover:text-lc-text-secondary transition-colors">Documentation</a>
            </div>
        </div>
    </footer>
</div>
