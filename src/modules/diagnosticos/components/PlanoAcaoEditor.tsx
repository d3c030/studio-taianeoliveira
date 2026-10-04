import { useRef } from "react";
import { Bold, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Simple rich text: **negrito** and lines starting with "• " as list items. */
export function PlanoAcaoEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrapBold = () => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e) || "texto";
    const next = value.slice(0, s) + `**${sel}**` + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 2, s + 2 + sel.length); });
  };

  const toggleList = () => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const lineEndIdx = value.indexOf("\n", e);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, lineEnd).split("\n");
    const allList = block.every((l) => l.startsWith("• "));
    const nextBlock = block.map((l) => (allList ? l.replace(/^• /, "") : l.startsWith("• ") ? l : `• ${l}`)).join("\n");
    onChange(value.slice(0, lineStart) + nextBlock + value.slice(lineEnd));
    requestAnimationFrame(() => el.focus());
  };

  const onKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key !== "Enter") return;
    const el = ev.currentTarget;
    const s = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const line = value.slice(lineStart, s);
    if (!line.startsWith("• ")) return;
    ev.preventDefault();
    if (line.trim() === "•") {
      onChange(value.slice(0, lineStart) + value.slice(s));
      requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart));
      return;
    }
    onChange(value.slice(0, s) + "\n• " + value.slice(s));
    requestAnimationFrame(() => el.setSelectionRange(s + 3, s + 3));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Button type="button" variant="outline" size="sm" onClick={wrapBold}><Bold className="h-4 w-4" /> Negrito</Button>
        <Button type="button" variant="outline" size="sm" onClick={toggleList}><List className="h-4 w-4" /> Lista</Button>
      </div>
      <Textarea ref={ref} rows={12} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} />
      <p className="text-xs text-muted-foreground">Use **texto** para negrito e "• " no início da linha para lista.</p>
    </div>
  );
}
