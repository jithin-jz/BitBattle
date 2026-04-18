<script>
  /**
   * TerminalPanel - Reusable terminal-styled container
   * Provides a consistent look with border frame and title bar
   */
  export let title = "";
  export let variant = "primary"; // primary, secondary, dark
  export let subtitle = "";
  export let showIndicator = false;

  const headerBase = "flex items-center justify-between gap-4 px-4 py-3 text-xs font-mono font-bold uppercase tracking-widest bg-surface-highest border-b border-surface-high";
  $: headerColor = variant === "secondary" ? "text-secondary" : "text-primary";
</script>

<div class="flex flex-col border border-surface-high bg-terminal-dark shadow-[0_0_20px_rgba(168,232,255,0.05)] {$$props.class || ''}">
  {#if title}
    <div class="{headerBase} {headerColor}">
      <div class="flex items-center gap-3">
        {#if showIndicator}
          <div class="inline-block w-2 h-2 rounded-full animate-pulse-intense {variant === 'secondary' ? 'bg-secondary' : 'bg-primary'}"></div>
        {/if}
        <span>{title}</span>
      </div>
      {#if subtitle}
        <span class="opacity-50 text-[10px]">{subtitle}</span>
      {/if}
    </div>
  {/if}
  <div class="flex-1 overflow-y-auto font-mono text-xs leading-relaxed bg-terminal-dark {$$props.contentClass || ''}">
    <slot></slot>
  </div>
</div>
