<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { isAuthenticated } from '../stores/auth.js';

    onMount(() => {
        if ($isAuthenticated) {
            goto('/lobby');
        } else {
            goto('/login');
        }
    });
</script>

<div class="mx-auto w-full max-w-7xl px-4 flex min-h-[70vh] items-center justify-center sm:px-6 lg:px-8">
    <div class="bg-surface-high flex flex-col items-center gap-5 px-10 py-10 text-center shadow-2xl">
        <div class="h-12 w-12 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
        <div>
            <div class="font-display text-lg font-bold uppercase tracking-widest text-white">Opening arena</div>
            <div class="mt-2 text-[10px] uppercase tracking-widest text-text-muted/60">Preparing your session...</div>
        </div>
    </div>
</div>
