"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Download } from "lucide-react";
import { getAlertsHistory, type AlertHistoryRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function exportCsv(rows: AlertHistoryRow[]) {
  const header = ["session", "time", "type", "severity"];
  const lines = [header.join(","), ...rows.map((r) => [r.session, r.time, r.type, r.severity].join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "smartwatch-alerts.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function SmartWatchAlertsPage() {
  const { data: alerts } = useSWR("sw-alerts-all", () => getAlertsHistory(), {
    refreshInterval: 30000,
  });
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const list = alerts ?? [];
    if (typeFilter === "all") return list;
    return list.filter((a) => a.type === typeFilter);
  }, [alerts, typeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground">History across processed sessions.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="violence">Violence</SelectItem>
            <SelectItem value="restricted_zone">Restricted zone</SelectItem>
            <SelectItem value="abnormal_activity">Abnormal activity</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => exportCsv(filtered)}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Snapshot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No alerts (or API offline).
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a, i) => (
                <TableRow key={`${a.session}-${a.time}-${a.type}-${i}`}>
                  <TableCell className="font-mono text-xs">{a.session}</TableCell>
                  <TableCell>{a.time}</TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell>{a.severity}</TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
