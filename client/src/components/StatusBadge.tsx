import { Badge } from "@/components/ui/badge";

type Status = "active" | "pending" | "approved" | "rejected" | "paid" | "completed" | "on_hold";

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Active", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  paid: { label: "Paid", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  on_hold: { label: "On Hold", variant: "outline" }
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className="rounded-full" data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}