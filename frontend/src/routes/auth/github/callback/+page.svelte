<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { user, accessToken, api } from '../../../../stores/auth.js';

    onMount(async () => {
        const code = $page.url.searchParams.get('code');
        if (!code) {
            goto('/login');
            return;
        }

        try {
            const res = await api(`/auth/github/callback?code=${code}`);
            if (res.ok) {
                const data = await res.json();
                accessToken.set(data.access_token);
                user.set(data.user);
                goto('/lobby');
            } else {
                console.error('GitHub callback failed');
                goto('/login');
            }
        } catch (e) {
            console.error('GitHub auth error:', e);
            goto('/login');
        }
    });
</script>

<div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; gap: 16px; position: relative; z-index: 1;">
    <div class="spinner"></div>
    <p class="text-muted">Authenticating with GitHub...</p>
</div>
