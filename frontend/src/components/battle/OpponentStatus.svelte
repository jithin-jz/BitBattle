<script lang="ts">
  /**
   * OpponentStatus - Shows live opponent activity and status
   */
  import TerminalPanel from "../terminal/TerminalPanel.svelte";
  import StatusBadge from "../terminal/StatusBadge.svelte";

  export let opponentName = "";
  export let opponentStatus = "standby"; // typing, testing, submitted, standby
  export let opponentRating = 0;
  export let submissionStatus: string | null = null; // null, pending, passed, failed

  const statusMap: Record<string, { badge: string; label: string }> = {
    typing: { badge: "info", label: "TRANSMITTING_CODE" },
    testing: { badge: "pending", label: "VALIDATING_SOLUTION" },
    submitted: { badge: "success", label: "SOLUTION_SUBMITTED" },
    standby: { badge: "pending", label: "STANDBY" },
  };

  $: status = statusMap[opponentStatus as keyof typeof statusMap] || statusMap.standby;
</script>

<TerminalPanel title="OPERATOR_TARGET" variant="secondary" class="animate-slide-in-right">
  <div class="p-6 space-y-4">
    <div class="flex items-center gap-4">
      <div class="flex h-16 w-16 items-center justify-center border-2 border-secondary bg-secondary/10 text-2xl font-black text-secondary italic">
        {(opponentName || "OP")?.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div class="font-display text-xl font-bold tracking-tight text-white">
          {opponentName || "SCANNING..."}
        </div>
        <div class="text-xs font-mono text-text-muted mt-1">
          Rating: {opponentRating || "--"}
        </div>
      </div>
    </div>

    <div class="border-t border-surface-high pt-4 space-y-3">
      <div class="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">
        ACTIVITY_STATUS
      </div>
      <StatusBadge 
        status={status.badge} 
        text={status.label}
        showIndicator={true}
      />
    </div>

    {#if submissionStatus}
      <div class="border-t border-surface-high pt-4">
        <div class="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">
          SUBMISSION_RESULT
        </div>
        <StatusBadge 
          status={submissionStatus === "passed" ? "success" : submissionStatus === "failed" ? "error" : "pending"}
          text={(submissionStatus || "").toUpperCase()}
          showIndicator={true}
        />
      </div>
    {/if}
  </div>
</TerminalPanel>
