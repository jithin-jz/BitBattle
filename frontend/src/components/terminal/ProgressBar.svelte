<script>
  /**
   * ProgressBar - Animated progress display with terminal styling
   */
  export let progress = 0; // 0-100
  export let variant = "primary"; // primary, secondary, success, error
  export let animated = true;
  export let height = "h-1";
  export let showLabel = false;

  $: percentage = Math.min(Math.max(progress, 0), 100);

  const colors = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    success: "bg-primary", // Success is cyan in this theme
    error: "bg-error", // Error is red/pink
  };
</script>

<div class="relative w-full overflow-hidden bg-surface-highest flex items-center {height}">
  <div
    class="h-full transition-all duration-500 ease-in-out {colors[variant] || colors.primary} {animated ? 'animate-neon-glow' : ''}"
    style="width: {percentage}%"
  ></div>
</div>
{#if showLabel}
  <div class="mt-2 text-xs font-mono text-text-muted">
    {percentage}%
  </div>
{/if}
