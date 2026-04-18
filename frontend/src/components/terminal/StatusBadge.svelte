<script lang="ts">
  /**
   * StatusBadge - Displays status with color coding
   * Variants: success, error, warning, pending, info
   */
  export let status = "info"; // success, error, warning, pending, info
  export let text = "";
  export let showIndicator = true;

  const configMap: Record<string, { bg: string; text: string; border: string; indicator: string; pulse?: boolean }> = {
    success: { 
      bg: "bg-success/5", 
      text: "text-success", 
      border: "border-success", 
      indicator: "bg-success",
      pulse: false
    },
    error: { 
      bg: "bg-error/5", 
      text: "text-error", 
      border: "border-error", 
      indicator: "bg-error",
      pulse: false
    },
    warning: { 
      bg: "bg-warning/5", 
      text: "text-warning", 
      border: "border-warning", 
      indicator: "bg-warning",
      pulse: true
    },
    pending: { 
      bg: "bg-text-muted/5", 
      text: "text-text-muted", 
      border: "border-text-muted", 
      indicator: "bg-text-muted",
      pulse: true
    },
    info: { 
      bg: "bg-primary/5", 
      text: "text-primary", 
      border: "border-primary", 
      indicator: "bg-primary",
      pulse: true
    },
  };

  $: config = configMap[status as keyof typeof configMap] || configMap.info;
</script>

<div class="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest {config.bg} {config.text} {config.border} border {$$props.class || ''}">
  {#if showIndicator}
    <div class="inline-block w-2 h-2 rounded-full {config.indicator} {config.pulse ? 'animate-pulse-intense' : ''}"></div>
  {/if}
  <span>{text}</span>
</div>
