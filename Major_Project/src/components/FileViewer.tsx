import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  filename: string;
  content: string;
  language?: string;
}

export const FileViewer = ({ filename, content }: Props) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success(`${filename} copied`);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rounded-md border border-border bg-terminal overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--neon-amber))]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">~/{filename}</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={copy} className="h-7 px-2 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-neon" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={download} className="h-7 px-2 text-xs">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <pre className="p-4 text-xs leading-relaxed overflow-auto max-h-[60vh] scanline">
        <code className="text-foreground/90">{content}</code>
      </pre>
    </div>
  );
};
