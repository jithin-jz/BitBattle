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

<div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
    <div class="spinner"></div>
</div>
