"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import { createReactInlineContentSpec } from "@blocknote/react";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteSchema, defaultInlineContentSpecs } from "@blocknote/core";
import "@blocknote/shadcn/style.css";
import api from "@/lib/api";
import { MentionHoverCard } from "./mention-hover-card";
import { en } from "@blocknote/core/locales";

// ── Custom Mention Inline Node ──────────────────────────────
const Mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: {
      userId: { default: "unknown" },
      name: { default: "Unknown User" },
    },
    content: "none",
  },
  {
    render: (props) => {
      // Return a colored tag that shows the user's name
      // We wrap it in MentionHoverCard to show profile on hover
      // Note: we fetch the full user detail in the card if needed, or pass basic ops
      const mockUser = {
        _id: props.inlineContent.props.userId,
        name: props.inlineContent.props.name,
      };
      return (
        <MentionHoverCard user={mockUser}>
          <span className="inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary cursor-pointer hover:bg-primary/25 transition-colors mx-0.5 align-baseline">
            @{props.inlineContent.props.name}
          </span>
        </MentionHoverCard>
      );
    },
  },
);

export const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: Mention,
  },
});

/**
 * Reusable Mention-aware Editor
 */
export function MentionEditor({
  workspaceId,
  initialContent,
  onChange,
  onMentionsChange,
  editable = true,
  placeholder = "Enter text or type '/' for commands and type '@' for mention",
  className = "",
  minimal = false,
}) {
  const { resolvedTheme } = useTheme();

  // Parse initial content
  const parsedInitial = useMemo(() => {
    if (!initialContent) return undefined;
    if (Array.isArray(initialContent)) return initialContent;
    if (typeof initialContent === "string") {
      try {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        if (initialContent.trim()) {
          return [
            {
              type: "paragraph",
              content: [{ type: "text", text: initialContent }],
            },
          ];
        }
      }
    }
    return undefined;
  }, [initialContent]);

  const locale = en;
  const editor = useCreateBlockNote({
    schema,
    initialContent: parsedInitial,
    dictionary: {
      ...locale,
      placeholders: {
        ...locale.placeholders,
        emptyDocument: placeholder,
        default: placeholder,
      },
    },
  });

  // Extract mentions from blocks recursively
  const extractMentions = useCallback((blocks) => {
    const mentions = [];
    const traverse = (blocksArr) => {
      for (const block of blocksArr) {
        if (block.content && Array.isArray(block.content)) {
          for (const inlineNode of block.content) {
            if (inlineNode.type === "mention") {
              const { userId, name } = inlineNode.props;
              // Avoid duplicates
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

  const handleChange = useCallback(() => {
    if (!editor) return;
    const blocks = editor.document;
    const json = JSON.stringify(blocks);
    if (onChange) onChange(json);

    if (onMentionsChange) {
      const detectedMentions = extractMentions(blocks);
      onMentionsChange(detectedMentions);
    }
  }, [onChange, onMentionsChange, editor, extractMentions]);

  // Command to get members for suggestion menu
  const getMentionItems = async (query) => {
    if (!workspaceId) return [];
    try {
      const q = query ? query.toLowerCase() : "";
      const { data } = await api.get(
        `/workspaces/${workspaceId}/members/search`,
        {
          params: { q },
        },
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
        // We can pass custom icon or view in render, but BlockNote standard items use title
      }));
    } catch (err) {
      console.error("Failed to fetch members for mention", err);
      return [];
    }
  };

  return (
    <div className={`blocknote-wrapper ${className} relative`}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        sideMenu={!minimal}
        formattingToolbar={true}
        slashMenu={!minimal}
      >
        <SuggestionMenuController
          triggerCharacter={"@"}
          getItems={getMentionItems}
        />
      </BlockNoteView>
    </div>
  );
}

/**
 * Read-only renderer for Mention content.
 */
export function MentionReadOnly({ content, className = "" }) {
  const { resolvedTheme } = useTheme();

  const parsedContent = useMemo(() => {
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
  }, [content]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: parsedContent,
  });

  if (!content) return null;

  return (
    <div className={`blocknote-wrapper blocknote-readonly ${className}`}>
      <BlockNoteView
        editor={editor}
        editable={false}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        sideMenu={false}
        formattingToolbar={false}
        slashMenu={false}
      />
    </div>
  );
}
