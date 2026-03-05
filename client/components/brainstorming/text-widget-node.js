"use client";

import { useCallback, useRef, useMemo } from "react";
import { useTheme } from "next-themes";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import { SuggestionMenuController } from "@blocknote/react";
import "@blocknote/shadcn/style.css";
import { useWorkspace } from "@/contexts/workspace-context";
import api from "@/lib/api";
import { schema } from "@/components/mention-editor";

// ── Debounce helper ───────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ══════════════════════════════════════════════════════
// TEXT WIDGET NODE
// ══════════════════════════════════════════════════════
export function TextWidgetNode({ widgetId, widgetData, onUpdateWidget }) {
  const { resolvedTheme } = useTheme();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?._id;

  // Keep a ref to the latest widgetData to avoid stale closures
  const widgetDataRef = useRef(widgetData);
  widgetDataRef.current = widgetData;

  // Parse initial content from widget data
  const parsedInitial = useMemo(() => {
    const content = widgetData?.content;
    if (!content) return undefined;
    if (Array.isArray(content)) return content;
    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        if (content.trim()) {
          return [
            {
              type: "paragraph",
              content: [{ type: "text", text: content }],
            },
          ];
        }
      }
    }
    return undefined;
  }, []); // Only parse once on mount

  // Create BlockNote editor with mention schema
  const editor = useCreateBlockNote({
    schema,
    initialContent: parsedInitial,
  });

  // ── Extract mentions from blocks ────────────────────
  const extractMentions = useCallback((blocks) => {
    const mentions = [];
    const traverse = (blocksArr) => {
      for (const block of blocksArr) {
        if (block.content && Array.isArray(block.content)) {
          for (const inlineNode of block.content) {
            if (inlineNode.type === "mention") {
              const { userId, name } = inlineNode.props;
              if (!mentions.some((m) => m.userId === userId)) {
                mentions.push({ userId, name });
              }
            }
          }
        }
        if (block.children && block.children.length > 0) {
          traverse(block.children);
        }
      }
    };
    traverse(blocks);
    return mentions;
  }, []);

  // ── Debounced save to API ───────────────────────────
  const debouncedSave = useMemo(
    () =>
      debounce((blocks) => {
        const mentions = extractMentions(blocks);
        onUpdateWidget(widgetId, {
          data: {
            ...widgetDataRef.current,
            content: blocks,
            mentions,
          },
        });
      }, 500),
    [widgetId, onUpdateWidget, extractMentions],
  );

  // ── Editor change handler ───────────────────────────
  const handleChange = useCallback(() => {
    if (!editor) return;
    const blocks = editor.document;
    debouncedSave(blocks);
  }, [editor, debouncedSave]);

  // ── Mention autocomplete ────────────────────────────
  const getMentionItems = useCallback(
    async (query) => {
      if (!workspaceId) return [];
      try {
        const q = query ? query.toLowerCase() : "";
        const { data } = await api.get(
          `/workspaces/${workspaceId}/members/search`,
          { params: { q } },
        );

        const members = data.data || [];
        return members.map((member) => ({
          title: member.name,
          onItemClick: () => {
            editor.insertInlineContent([
              {
                type: "mention",
                props: {
                  userId: member._id,
                  name: member.name,
                },
              },
              { type: "text", text: " " },
            ]);
          },
        }));
      } catch (err) {
        console.error("Failed to fetch members for mention", err);
        return [];
      }
    },
    [workspaceId, editor],
  );

  return (
    <div
      className="flex flex-col h-full bg-background rounded-b-lg overflow-hidden nodrag nowheel"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-auto p-1 text-widget-editor">
        <BlockNoteView
          editor={editor}
          editable={true}
          onChange={handleChange}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          sideMenu={true}
          formattingToolbar={true}
          slashMenu={true}
        >
          <SuggestionMenuController
            triggerCharacter={"@"}
            getItems={getMentionItems}
          />
        </BlockNoteView>
      </div>
    </div>
  );
}
