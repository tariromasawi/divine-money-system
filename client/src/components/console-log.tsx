import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";

interface ConsoleLogProps {
  logs: string[];
  className?: string;
}

export function ConsoleLog({ logs, className }: ConsoleLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className={cn("bg-black border border-border font-mono text-xs p-4 h-full flex flex-col", className)}>
      <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2">
        <span className="text-primary font-bold">SYSTEM_LOGS :: /var/log/syslog</span>
        <span className="text-muted-foreground animate-pulse">● LIVE</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {logs.slice().reverse().map((log, i) => (
            <div key={i} className="text-white/70 hover:text-white transition-colors">
              <span className="text-coherence mr-2">➜</span>
              {log}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
