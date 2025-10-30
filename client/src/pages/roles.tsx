import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Briefcase, ClipboardList, UserCog, User, Check } from "lucide-react";

const roles = [
  {
    name: "Super Admin",
    value: "super_admin",
    icon: Shield,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description: "Full system access with all permissions",
    permissions: [
      "Manage all users and assign roles",
      "Create, edit, and delete projects",
      "Assign project managers and supervisors",
      "Manage employee types and pay rates",
      "Create and edit work logs",
      "Manage payment periods and approve payments",
      "Review and approve correction requests",
      "Access all reports and data"
    ],
    notes: "Reserved for kholofelo@mooya.co.za. Highest level of access."
  },
  {
    name: "Admin",
    value: "admin",
    icon: Users,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    description: "Full operational access to manage the system",
    permissions: [
      "Manage all users and assign roles",
      "Create, edit, and delete projects",
      "Assign project managers and supervisors",
      "Manage employee types and pay rates",
      "Create and edit work logs",
      "Manage payment periods and approve payments",
      "Review and approve correction requests",
      "Access all reports and data"
    ],
    notes: "Default role for @xnext.co.za emails. Nearly identical to super admin."
  },
  {
    name: "Project Manager",
    value: "project_manager",
    icon: Briefcase,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description: "Manages projects with limited editing permissions",
    permissions: [
      "View all projects they manage",
      "Update project status only (cannot edit other fields)",
      "Assign supervisors to projects",
      "Onboard and manage labourers",
      "Manage pay rates",
      "Create work logs (today only)",
      "Edit their own work logs",
      "Create and manage payment periods",
      "Approve payment periods",
      "View all reports",
      "Review and approve correction requests"
    ],
    restrictions: [
      "Cannot create new projects",
      "Cannot edit project details (name, location, etc.)",
      "Cannot assign project managers"
    ],
    notes: "Focused on operational oversight with controlled permissions. Note: Daily work logging UI may not be visible in navigation but the capability exists."
  },
  {
    name: "Supervisor",
    value: "supervisor",
    icon: ClipboardList,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    description: "Field-focused role for daily work tracking",
    permissions: [
      "View assigned projects only",
      "Create work logs for today",
      "Onboard labourers (register new workers)",
      "Submit correction requests for historical data"
    ],
    restrictions: [
      "Cannot create or edit projects",
      "Cannot manage payment periods",
      "Cannot access all projects",
      "Cannot edit past work logs (must submit correction request)"
    ],
    notes: "Default role for @mooya.co.za and @mooyawireless.co.za emails. Designed for mobile field use."
  },
  {
    name: "Project Admin",
    value: "project_admin",
    icon: UserCog,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    description: "Team management focused on labourer onboarding",
    permissions: [
      "Onboard labourers (register new workers)",
      "View assigned projects",
      "Create work logs for today"
    ],
    restrictions: [
      "Cannot create or edit projects",
      "Cannot manage payment periods",
      "Limited to team management tasks"
    ],
    notes: "Similar to supervisor but focused on team administration."
  },
  {
    name: "Labourer",
    value: "labourer",
    icon: User,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    description: "Limited access for workers in the field",
    permissions: [
      "View their assigned project only",
      "Create work logs for today only"
    ],
    restrictions: [
      "Cannot view other projects",
      "Cannot edit past work logs",
      "Cannot submit correction requests",
      "Cannot manage any system data"
    ],
    notes: "Primarily a data entity. Most labourers don't have user accounts."
  }
];

export default function RolesPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-roles">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-roles">System Roles & Permissions</h1>
        <p className="text-muted-foreground" data-testid="text-roles-description">
          Mooya EMPCare uses role-based access control (RBAC) to manage permissions. 
          Below is a complete overview of each role and what they can do in the system.
        </p>
      </div>

      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h2 className="font-semibold mb-2">Role Assignment Rules</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li><strong>kholofelo@mooya.co.za</strong> → Always assigned Super Admin (cannot be changed)</li>
          <li><strong>@xnext.co.za emails</strong> → Default to Admin role</li>
          <li><strong>@mooya.co.za and @mooyawireless.co.za emails</strong> → Default to Supervisor role</li>
          <li><strong>OIDC role claims</strong> → Override default assignments (useful for testing)</li>
        </ul>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card key={role.value} className="flex flex-col" data-testid={`card-role-${role.value}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${role.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl" data-testid={`text-role-name-${role.value}`}>
                        {role.name}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1 font-mono text-xs" data-testid={`badge-role-value-${role.value}`}>
                        {role.value}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription data-testid={`text-role-description-${role.value}`}>
                  {role.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-400">
                    ✓ Permissions
                  </h3>
                  <ul className="space-y-1.5">
                    {role.permissions.map((permission, index) => (
                      <li 
                        key={index} 
                        className="text-sm flex items-start gap-2"
                        data-testid={`text-permission-${role.value}-${index}`}
                      >
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{permission}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {role.restrictions && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-red-700 dark:text-red-400">
                      ✗ Restrictions
                    </h3>
                    <ul className="space-y-1.5">
                      {role.restrictions.map((restriction, index) => (
                        <li 
                          key={index} 
                          className="text-sm text-muted-foreground flex items-start gap-2"
                          data-testid={`text-restriction-${role.value}-${index}`}
                        >
                          <span className="text-red-600 dark:text-red-400">✗</span>
                          <span>{restriction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {role.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground italic" data-testid={`text-notes-${role.value}`}>
                      {role.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h2 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
          Security Features
        </h2>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li><strong>Defense-in-depth:</strong> Permissions enforced at both frontend (UI visibility) and backend (API validation)</li>
          <li><strong>Domain restrictions:</strong> Only @mooya.co.za, @mooyawireless.co.za, and @xnext.co.za emails can access the system</li>
          <li><strong>Audit trails:</strong> All corrections tracked through formal review process</li>
          <li><strong>Today-only work logs:</strong> Supervisors can only create work logs for today (historical edits require correction requests)</li>
        </ul>
      </div>
    </div>
  );
}
