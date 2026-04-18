<script lang="ts">
  /**
   * ProblemStatement - Terminal-styled problem display
   * Shows problem title, description, examples, and constraints
   */
  import TerminalPanel from "../terminal/TerminalPanel.svelte";
  
  export let problem: any = null;
</script>

<TerminalPanel title="DATA_PACKET.md" subtitle={problem?.difficulty || "LEVEL_UNSPEC"}>
  <div class="p-8 overflow-y-auto text-sm font-medium leading-relaxed text-text-muted flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-high">
    {#if problem}
      <h2 class="font-display text-2xl font-bold uppercase tracking-tight text-white mb-6 italic">
        {problem.title}
      </h2>
      <div class="break-words whitespace-normal [&_h3]:text-primary [&_h3]:mt-4 [&_h3]:mb-2 [&_code]:bg-primary/10 [&_code]:text-primary [&_code]:px-1 [&_code]:py-0.5 space-y-4">
        {@html problem.description
          .replace(/\n/g, "<br>")
          .replace(
            /```(\w+)?\n([\s\S]*?)```/g,
            '<div class="bg-terminal-dark px-4 py-3 border-l-2 border-primary font-mono text-xs my-4">$2</div>',
          )
          .replace(
            /`([^`]+)`/g,
            '<span class="text-secondary italic"> $1 </span>',
          )}
      </div>
    {:else}
      <div class="bg-surface-high/30 p-4 border border-outline/20 italic opacity-50">
        Waiting for match synchronization...
      </div>
    {/if}
  </div>
</TerminalPanel>
