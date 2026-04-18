<script>
    import {
        requestOTP,
        verifyOTP,
        loginWithGithub,
        isAuthenticated,
    } from "../../stores/auth.js";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

    export let data;
    export let params;

    let username = "";
    let otp = "";
    let showOtp = false;
    let loading = false;
    let error = "";

    function handleOtpInput(e) {
        otp = e.target.value.replace(/\D/g, "").slice(0, 6);
        e.target.value = otp;
    }

    onMount(() => {
        if ($isAuthenticated) goto("/lobby");
    });

    async function handleLogin() {
        if (!username) return;
        loading = true;
        error = "";
        try {
            await requestOTP(username);
            showOtp = true;
        } catch (e) {
            error = e.message || "Something went wrong. Please try again.";
        }
        loading = false;
    }

    async function verifyOtp() {
        if (otp.length !== 6) return;
        loading = true;
        error = "";
        try {
            await verifyOTP(username, otp);
            goto("/lobby");
        } catch (e) {
            error = e.message || "Invalid verification code.";
        }
        loading = false;
    }

    function handleGitHub() {
        loginWithGithub();
    }
</script>

<svelte:head>
    <title>Sign In - CodeBattle</title>
</svelte:head>

<div class="flex-grow flex items-center justify-center p-6 sm:p-12 bg-lc-bg">
    <div class="w-full max-w-[440px] fade-in">
        <div class="text-center mb-10">
            <div class="inline-block w-3 h-12 bg-lc-orange rounded-full mb-6"></div>
            <h1 class="text-3xl font-bold tracking-tight text-lc-text-primary mb-2">Welcome Back</h1>
            <p class="text-lc-text-secondary text-sm">Empower your coding skills in real-time duels</p>
        </div>

        <div class="lc-card p-8 bg-lc-surface/50 backdrop-blur-sm shadow-xl">
            {#if error}
                <div class="mb-6 p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            {/if}

            <div class="space-y-6">
                {#if !showOtp}
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label for="username" class="text-xs font-semibold text-lc-text-secondary uppercase tracking-wider">Username</label>
                            <input
                                id="username"
                                type="text"
                                bind:value={username}
                                placeholder="e.g. josh_hacker"
                                class="lc-input"
                                disabled={loading}
                            />
                        </div>
                        <button
                            on:click={handleLogin}
                            disabled={loading || !username}
                            class="w-full lc-button-primary"
                        >
                            {loading ? "Initializing..." : "Sign In with OTP"}
                        </button>
                    </div>

                    <div class="relative py-4">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-lc-border"></div>
                        </div>
                        <div class="relative flex justify-center text-xs uppercase">
                            <span class="bg-lc-surface px-2 text-lc-text-muted">Or continue with</span>
                        </div>
                    </div>

                    <button
                        on:click={handleGitHub}
                        class="w-full lc-button-secondary flex items-center justify-center gap-3"
                    >
                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                        </svg>
                        GitHub Account
                    </button>
                {:else}
                    <div class="space-y-6">
                        <div class="text-center">
                            <div class="text-xs text-lc-text-secondary uppercase tracking-widest mb-2">Check your email</div>
                            <div class="text-lg font-bold text-lc-orange">Verification Code Sent</div>
                        </div>

                        <div class="space-y-4">
                            <input
                                id="otp"
                                type="text"
                                maxlength="6"
                                bind:value={otp}
                                on:input={handleOtpInput}
                                placeholder="Six-digit code"
                                class="lc-input text-center text-3xl font-mono tracking-widest py-4"
                            />
                            
                            <div class="flex gap-3">
                                <button
                                    on:click={() => (showOtp = false)}
                                    class="flex-1 lc-button-secondary text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    on:click={verifyOtp}
                                    disabled={loading || otp.length < 6}
                                    class="flex-[2] lc-button-primary text-sm"
                                >
                                    {loading ? "Verifying..." : "Confirm Access"}
                                </button>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <p class="mt-8 text-center text-xs text-lc-text-muted">
            New to CodeBattle? Just enter a username to get started. No password required.
        </p>
    </div>
</div>
