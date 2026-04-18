<script>
  /**
   * ConsoleLog - Display terminal-style console logs
   * Shows formatted output with line indicators
   */
  export let logs = []; // Array of { type, message }
  export let height = "h-48";
  export let maxLines = 100;

  const typeConfig = {
    info: { color: "var(--primary)", prefix: "[INFO] " },
    success: { color: "var(--success)", prefix: "[✓] " },
    error: { color: "var(--error)", prefix: "[✗] " },
    warn: { color: "var(--warning)", prefix: "[!] " },
    debug: { color: "var(--text-muted)", prefix: "[DEBUG] " },
    log: { color: "var(--text)", prefix: "> " },
  };

  $: displayLogs = logs.slice(-maxLines);
</script>

<div class={`console-log thin-scrollbar ${height} overflow-y-auto`}>
  {#each displayLogs as log, i (i)}
    <div 
      class="console-log-line {log.type || 'log'}"
      style={`color: ${typeConfig[log.type]?.color || 'var(--text)'}`}
    >
      <span class="opacity-50">{String(i + 1).padStart(3, ' ')}:</span>
      <span class="console-log-prompt">{typeConfig[log.type]?.prefix || '> '}</span>
      {log.message}
    </div>
  {/each}
</div>

<style>
  :global(.console-log) {
    font-family: 'ui-monospace', monospace;
    font-size: 0.75rem;
    line-height: 1.6;
    background: var(--terminal-dark);
    color: var(--text-muted);
    padding: 0.5rem 0;
  }

  :global(.console-log-line) {
    display: block;
    padding: 0.25rem 1rem;
  }

  :global(.console-log-line.success) {
    color: var(--success);
  }

  :global(.console-log-line.error) {
    color: var(--error);
  }

  :global(.console-log-line.info) {
    color: var(--primary);
  }

  :global(.console-log-line.warn) {
    color: var(--warning);
  }

  :global(.console-log-line.debug) {
    color: var(--text-muted);
  }

  :global(.console-log-prompt) {
    color: var(--primary);
    font-weight: bold;
  }
</style>
