"use client";

import { useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/shadcn/style.css";

/**
 * Reusable BlockNote WYSIWYG editor.
 *
 * Props:
 * - initialContent: BlockNote JSON string or Block[] — initial content
 * - onChange: (jsonString: string) => void — called with serialized JSON string on change
 * - editable: boolean — default true
 * - placeholder: string — placeholder text
 * - className: string — wrapper class
 * - minimal: boolean — if true, uses a compact config (no table, headings limited)
 */
export function BlockNoteEditor({
  initialContent,
  onChange,
  editable = true,
  placeholder = "Tulis sesuatu...",
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
        // Not JSON, treat as plain text — convert to a paragraph block
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

  const editor = useCreateBlockNote({
    initialContent: parsedInitial,
    domAttributes: {
      editor: {
        "data-placeholder": placeholder,
      },
    },
  });

  const handleChange = useCallback(() => {
    if (!onChange || !editor) return;
    const blocks = editor.document;
    const json = JSON.stringify(blocks);
    onChange(json);
  }, [onChange, editor]);

  return (
    <div className={`blocknote-wrapper ${className}`}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        sideMenu={!minimal}
        formattingToolbar={true}
        slashMenu={!minimal}
      />
    </div>
  );
}

/**
 * Read-only renderer for BlockNote content.
 */
export function BlockNoteReadOnly({ content, className = "" }) {
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

/**
 * Helper: check if BlockNote content is empty.
 */
export function isBlockNoteEmpty(content) {
  if (!content) return true;
  try {
    const blocks = typeof content === "string" ? JSON.parse(content) : content;
    if (!Array.isArray(blocks) || blocks.length === 0) return true;
    // Check if all blocks are empty paragraphs
    return blocks.every((block) => {
      if (block.type !== "paragraph") return false;
      if (!block.content || block.content.length === 0) return true;
      return block.content.every(
        (c) => c.type === "text" && (!c.text || c.text.trim() === ""),
      );
    });
  } catch {
    return !content || (typeof content === "string" && !content.trim());
  }
}
