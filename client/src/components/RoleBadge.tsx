import { Badge } from "@/components/ui/badge";

type UserRole = "super_admin" | "admin" | "project_manager" | "supervisor" | "project_admin" | "labourer";

interface RoleBadgeProps {
  role: UserRole;
}

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  project_manager: "Project Manager",
  supervisor: "Supervisor",
  project_admin: "Project Admin",
  labourer: "Labourer"
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1" data-testid={`badge-role-${role}`}>
      {roleLabels[role]}
    </Badge>
  );
}