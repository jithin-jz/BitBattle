<script>
  /**
   * TestRunner - Real-time test execution display
   * Shows test results with animations and status indicators
   */
  import TerminalPanel from "../terminal/TerminalPanel.svelte";
  import ProgressBar from "../terminal/ProgressBar.svelte";

  export let testResults = [];
  export let isRunning = false;
  export let passedCount = 0;
  export let totalCount = 0;

  $: progressPercent = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
</script>

<div class="space-y-4">
  <!-- Progress Summary -->
  <TerminalPanel title="OBJECTIVE_PROGRESS">
    <div class="p-6 space-y-4">
      <div class="flex items-end justify-between">
        <div class="font-display text-3xl font-black text-white italic">
          {passedCount}/{totalCount || 0} SECTORS
        </div>
        <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/60">
          {passedCount === totalCount && totalCount > 0 ? "CLEAR_TO_SUBMIT" : "VALIDATION_PENDING"}
        </div>
      </div>
      <ProgressBar progress={progressPercent} animated={true} />
    </div>
  </TerminalPanel>

  <!-- Test Results -->
  <TerminalPanel title="EXECUTION_LOG" subtitle={`RESULT_COUNT: ${testResults.length}`}>
    <div class="overflow-y-auto bg-terminal-dark p-4 min-h-[250px] space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-high">
      {#if testResults.length > 0}
        {#each testResults as res, i (i)}
          <div
            class="px-4 py-3 border-l-2 animate-slide-down {res.passed
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-error bg-error/5 text-error'}"
            style="animation-delay: {i * 50}ms"
          >
            <div class="font-black uppercase tracking-widest flex justify-between text-xs">
              <span>TEST_{i + 1}</span>
              <span class="font-mono">
                {res.passed ? "✓ PASSED" : "✗ FAILED"}
              </span>
            </div>
            {#if !res.passed}
              <div class="mt-2 opacity-70 leading-relaxed break-all text-xs">
                <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/60">EXPECTED:</div>
                <code class="block bg-surface-high/30 p-2 my-1 text-[11px]">{res.expected}</code>
                <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/60 mt-2">RECEIVED:</div>
                <code class="block bg-surface-high/30 p-2 my-1 text-[11px]">{res.actual}</code>
              </div>
            {/if}
          </div>
        {/each}
      {:else}
        <div class="text-text-muted/30 italic uppercase tracking-widest text-center mt-12 text-xs">
          {isRunning ? "Running tests..." : "Waiting for local validation..."}
        </div>
      {/if}
    </div>
  </TerminalPanel>
</div>
