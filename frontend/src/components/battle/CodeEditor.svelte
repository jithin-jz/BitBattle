<script lang="ts">
  /**
   * CodeEditor - CodeMirror wrapper with terminal styling
   * Provides a consistent editor interface with terminal aesthetic
   */
  import TerminalPanel from "../terminal/TerminalPanel.svelte";
  import { onMount, onDestroy } from "svelte";

  export let code = "// Write your solution here\n\nfunction solution(input) {\n  // Your code\n}\n";
  export let onCodeChange = () => {};

  let editorContainer: HTMLDivElement | undefined;
  let editorView: any;

  onMount(async () => {
    await initEditor();
  });

  onDestroy(() => {
    if (editorView) {
      editorView.destroy();
    }
  });

  async function initEditor() {
    const { EditorView, basicSetup } = await import("codemirror");
    const { javascript } = await import("@codemirror/lang-javascript");
    const { EditorState } = await import("@codemirror/state");

    if (!editorContainer) return;

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        javascript(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            code = update.state.doc.toString();
            onCodeChange();
          }
        }),
        EditorView.theme({
          "&": {
            fontSize: "15px",
            height: "100%",
            color: "var(--color-text)",
            backgroundColor: "transparent",
          },
          ".cm-scroller": {
            fontFamily: "var(--font-mono)",
            lineHeight: "1.6",
          },
          ".cm-content": { caretColor: "var(--color-primary)" },
          ".cm-cursor": { borderLeftColor: "var(--color-primary)" },
          ".cm-gutters": {
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRight: "1px solid var(--color-surface-high)",
            color: "var(--color-text-muted)",
          },
          ".cm-activeLine": {
            backgroundColor: "rgba(168, 232, 255, 0.05)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "rgba(168, 232, 255, 0.08)",
          },
          ".cm-selectionBackground": {
            backgroundColor: "rgba(168, 232, 255, 0.15)",
          },
          ".cm-matchingBracket": {
            backgroundColor: "rgba(168, 232, 255, 0.2)",
            outline: "none",
          },
          ".cm-nonmatchingBracket": {
            backgroundColor: "rgba(255, 180, 171, 0.2)",
          },
        }),
      ],
    });

    editorView = new EditorView({ state, parent: editorContainer });
  }
</script>

<TerminalPanel title="TERMINAL_WORKSPACE" subtitle="UTF-8">
  <div
    class="flex-1 bg-terminal-dark overflow-hidden [&_.cm-editor]:outline-none [&_.cm-editor]:border-none [&_.cm-editor.cm-focused]:outline-none"
    bind:this={editorContainer}
  ></div>
</TerminalPanel>
