import { Badge } from "@/components/ui/badge";
import type { PipelineStatus } from "@/lib/api";

export function AlertBadge({ status }: { status: PipelineStatus | "unknown" }) {
  if (status === "running") {
    return <Badge variant="success">LIVE</Badge>;
  }
  if (status === "error") {
    return <Badge variant="destructive">ERROR</Badge>;
  }
  if (status === "idle") {
    return <Badge variant="warning">IDLE</Badge>;
  }
  return <Badge variant="secondary">…</Badge>;
}
