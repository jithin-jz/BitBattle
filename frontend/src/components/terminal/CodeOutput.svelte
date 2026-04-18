<script>
  /**
   * CodeOutput - Display formatted code/test output
   */
  export let output = "";
  export let type = "code"; // code, log, error
  export let title = "";

  $: displayClass = type === "error" ? "error" : type === "log" ? "log" : "code";
</script>

<div class="code-output {displayClass}">
  {#if title}
    <div class="font-bold mb-2 uppercase tracking-wider text-primary">
      {title}
    </div>
  {/if}
  <pre class="font-mono text-xs whitespace-pre-wrap break-words">{output}</pre>
</div>

<style>
  :global(.code-output) {
    font-family: 'ui-monospace', monospace;
    font-size: 0.75rem;
    padding: 1rem;
    border-radius: 0;
    background: var(--terminal-dark);
    border-left: 3px solid var(--primary);
    color: var(--text);
    overflow-x: auto;
  }

  :global(.code-output.success) {
    border-left-color: var(--success);
    color: var(--success);
  }

  :global(.code-output.error) {
    border-left-color: var(--error);
    color: var(--error);
  }

  :global(.code-output.log) {
    border-left-color: var(--secondary);
    color: var(--secondary);
  }

  :global(pre) {
    margin: 0;
    line-height: 1.5;
  }
</style>
