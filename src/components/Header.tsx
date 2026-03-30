import { Satellite } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/queries";

export function Header() {
  const { data: config } = useConfig();
  const modeEntry = config?.find((c) => c.name === "CANOPY_MODE");
  const mode = modeEntry?.status === "set" ? modeEntry.value : null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <Satellite className="size-5 text-primary" />
        <span className="text-lg font-semibold">Harvest</span>
      </div>
      <div className="flex items-center gap-3">
        {mode && (
          <Badge
            variant={mode === "production" ? "default" : "secondary"}
            className={
              mode === "production"
                ? "bg-green-600/20 text-green-400 border-green-600/30"
                : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
            }
          >
            {mode}
          </Badge>
        )}
        <Button variant="outline" size="sm" disabled>
          Start Poll
        </Button>
      </div>
    </header>
  );
}
