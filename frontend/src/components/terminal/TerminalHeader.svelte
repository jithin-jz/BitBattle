<script>
  /**
   * TerminalHeader - Section header with terminal styling
   * Displays important section titles with neon underline
   */
  export let level = 2; // h1-h6
  export let variant = "primary"; // primary, secondary
  export let text = "";

  const variantColor = variant === "secondary" ? "var(--secondary)" : "var(--primary)";
</script>

<svelte:element 
  this={`h${level}`}
  class="terminal-header {variant}"
>
  {text || ''}
  <slot></slot>
</svelte:element>

<style>
  :global(.terminal-header) {
    font-family: 'ui-monospace', monospace;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--primary);
    margin: 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--primary);
    position: relative;
  }

  :global(.terminal-header.secondary) {
    color: var(--secondary);
    border-bottom-color: var(--secondary);
  }
</style>
