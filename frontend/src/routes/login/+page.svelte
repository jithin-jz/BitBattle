<script>
    import { requestOTP, verifyOTP, loginWithGithub, isAuthenticated } from '../../stores/auth.js';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    let email = '';
    let otp = '';
    let step = 'email'; // 'email' | 'otp'
    let loading = false;
    let error = '';
    let debugOtp = '';

    function handleOtpInput(e) {
        otp = e.target.value.replace(/\D/g, '').slice(0, 6);
        e.target.value = otp;
    }

    onMount(() => {
        if ($isAuthenticated) goto('/lobby');
    });

    async function handleRequestOTP() {
        loading = true;
        error = '';
        try {
            const res = await requestOTP(email);
            if (res.otp_debug) debugOtp = res.otp_debug;
            step = 'otp';
        } catch (e) {
            error = e.message || 'Failed to send OTP';
        }
        loading = false;
    }

    async function handleVerifyOTP() {
        loading = true;
        error = '';
        try {
            await verifyOTP(email, otp);
            goto('/lobby');
        } catch (e) {
            error = e.message || 'Verification failed';
        }
        loading = false;
    }

    function handleGitHub() {
        loginWithGithub();
    }
</script>

<svelte:head>
    <title>Join the Arena — Coding Fun</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center p-6 bg-paper-bg relative overflow-hidden">
    <!-- Floating Background Elements -->
    <div class="absolute top-10 left-10 text-6xl opacity-20 float-anim">🎲</div>
    <div class="absolute bottom-20 right-10 text-6xl opacity-20 float-anim" style="animation-delay: 1s;">⚡</div>
    <div class="absolute top-1/2 left-20 text-4xl opacity-10 float-anim" style="animation-delay: 2s;">🎈</div>

    <div class="w-full max-w-md z-10">
        <div class="text-center mb-10">
            <div class="w-24 h-24 bg-white rounded-bubble shadow-bubble mx-auto flex items-center justify-center text-5xl border-4 border-kid-blue mb-4 float-anim">⚔️</div>
            <h1 class="text-5xl font-[800] text-slate-800 tracking-tighter mb-2">Coding <span class="text-kid-pink">Arena</span></h1>
            <p class="text-slate-500 font-bold">The ultimate place to play with code!</p>
        </div>

        <div class="bubbly-card p-10 bg-white">
            {#if step === 'email'}
                <h2 class="text-2xl font-black text-slate-800 mb-2">Enter the Arena!</h2>
                <p class="text-slate-500 mb-8 font-medium">Ready to play? Just enter your email.</p>

                <form on:submit|preventDefault={handleRequestOTP} class="space-y-6">
                    <div class="space-y-2">
                        <label for="email-input" class="text-sm font-black text-slate-400 uppercase tracking-widest ml-4">Your Email</label>
                        <input
                            id="email-input"
                            type="email"
                            class="w-full px-6 py-4 rounded-full bg-slate-50 border-4 border-transparent focus:border-kid-blue focus:bg-white transition-all outline-none font-bold text-slate-700 placeholder-slate-300"
                            placeholder="ninja@code.fun"
                            bind:value={email}
                            required
                            disabled={loading}
                        />
                    </div>

                    {#if error}
                        <div class="bg-rose-50 border-2 border-rose-100 text-rose-500 px-4 py-3 rounded-bubble-sm text-sm font-bold animate-shake">
                            🚫 {error}
                        </div>
                    {/if}

                    <button type="submit" class="btn-kid btn-blue w-full text-xl" disabled={loading || !email}>
                        {#if loading}
                            <span class="animate-spin inline-block mr-2">🌀</span>
                        {/if}
                        Send Magic Key 📧
                    </button>
                </form>

                <div class="flex items-center gap-4 my-8">
                    <div class="h-1 flex-1 bg-slate-50 rounded-full"></div>
                    <span class="text-slate-300 font-black text-xs uppercase tracking-widest">or play with</span>
                    <div class="h-1 flex-1 bg-slate-50 rounded-full"></div>
                </div>

                <button class="w-full py-4 rounded-full border-4 border-slate-100 font-black text-slate-400 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-3" on:click={handleGitHub}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Connect GitHub
                </button>

            {:else}
                <h2 class="text-2xl font-black text-slate-800 mb-2">Check your mail!</h2>
                <p class="text-slate-500 mb-8 font-medium">Type the 6-digit code for <span class="text-kid-blue">{email}</span></p>

                {#if debugOtp}
                    <div class="bg-kid-green/20 border-2 border-kid-green px-4 py-2 rounded-bubble-sm text-emerald-700 font-bold text-center mb-6">
                        Dev Key: {debugOtp}
                    </div>
                {/if}

                <form on:submit|preventDefault={handleVerifyOTP} class="space-y-8">
                    <input
                        id="otp-input"
                        type="text"
                        inputmode="numeric"
                        class="w-full bg-slate-50 border-b-8 border-slate-200 focus:border-kid-pink p-4 text-center text-4xl font-black tracking-[0.3em] outline-none transition-all text-slate-700"
                        placeholder="000000"
                        value={otp}
                        on:input={handleOtpInput}
                        required
                        maxlength="6"
                        disabled={loading}
                    />

                    <button type="submit" class="btn-kid btn-pink w-full text-xl" disabled={loading || otp.length !== 6}>
                        Enter the Arena ⚡
                    </button>
                </form>

                <button class="w-full mt-6 text-slate-400 font-bold hover:text-slate-600 transition-colors" on:click={() => { step = 'email'; error = ''; otp = ''; }}>
                    ← Use different email
                </button>
            {/if}
        </div>
    </div>
</div>

<style>


    .animate-shake {
        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }

    @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
    }
</style>
