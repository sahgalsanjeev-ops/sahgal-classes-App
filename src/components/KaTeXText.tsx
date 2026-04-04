import type { ReactNode } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";

type KaTeXTextProps = {
  text: string;
  className?: string;
  /** When true, empty string returns null (no placeholder) */
  emptyAsNull?: boolean;
};

function renderInlineWithDollars(s: string, keyPrefix: string): ReactNode[] {
  if (!s) return [];
  const segs = s.split(/(\$[^$\n]+\$)/g);
  return segs.map((seg, j) => {
    if (seg.startsWith("$") && seg.endsWith("$")) {
      const inner = seg.slice(1, -1).trim();
      try {
        const html = katex.renderToString(inner, {
          displayMode: false,
          throwOnError: false,
        });
        return (
          <span
            key={`${keyPrefix}-${j}`}
            className="katex-inline mx-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return (
          <span key={`${keyPrefix}-${j}`} className="text-destructive text-xs">
            {seg}
          </span>
        );
      }
    }
    return (
      <span key={`${keyPrefix}-${j}`} className="whitespace-pre-wrap">
        {seg}
      </span>
    );
  });
}

/**
 * Renders plain text with optional KaTeX:
 * - Inline: `$...$` (single dollar pairs)
 * - Display: `$$...$$` (double dollar blocks)
 */
export function KaTeXText({ text, className, emptyAsNull }: KaTeXTextProps) {
  if (emptyAsNull && !text.trim()) return null;

  const parts = text.split("$$");
  const block: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      const inline = renderInlineWithDollars(part, `b${i}`);
      block.push(...inline);
    } else {
      const trimmed = part.trim();
      if (!trimmed) return;
      try {
        const html = katex.renderToString(trimmed, {
          displayMode: true,
          throwOnError: false,
        });
        block.push(
          <div
            key={`disp-${i}`}
            className="my-4 overflow-x-auto py-2 text-center [&_.katex]:text-base"
            dangerouslySetInnerHTML={{ __html: html }}
          />,
        );
      } catch {
        block.push(
          <div key={`disp-${i}`} className="text-destructive text-xs">
            {trimmed}
          </div>,
        );
      }
    }
  });

  if (block.length === 0) return null;

  return <div className={cn("text-sm leading-relaxed text-foreground", className)}>{block}</div>;
}

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
