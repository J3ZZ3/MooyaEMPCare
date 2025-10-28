import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { User, Project, PaymentPeriod, Labourer, WorkLog } from "@shared/schema";

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  // Fetch user-specific data based on role - ALL HOOKS AT TOP LEVEL
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: ["super_admin", "admin", "project_manager", "supervisor", "project_admin"].includes(user.role),
  });

  const { data: paymentPeriods, isLoading: periodsLoading } = useQuery<PaymentPeriod[]>({
    queryKey: ["/api/payment-periods"],
    enabled: ["super_admin", "admin", "project_manager", "supervisor", "project_admin"].includes(user.role),
  });

  const projectId = projects?.[0]?.id;
  const { data: labourers, isLoading: labourersLoading } = useQuery<Labourer[]>({
    queryKey: projectId ? [`/api/projects/${projectId}/labourers`] : [],
    enabled: user.role === "supervisor" && !!projectId,
  });

  // Labourer-specific queries - hoisted to top level
  const { data: labourerProfile } = useQuery<Labourer>({
    queryKey: [`/api/users/${user.id}/labourer-profile`],
    enabled: user.role === "labourer",
  });

  const { data: workLogs } = useQuery<WorkLog[]>({
    queryKey: labourerProfile ? [`/api/labourers/${labourerProfile.id}/work-logs`] : [],
    enabled: user.role === "labourer" && !!labourerProfile,
  });

  const isLoading = projectsLoading || periodsLoading || labourersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Super Admin and Admin see Project Manager dashboard
  if (["super_admin", "admin", "project_manager"].includes(user.role)) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user.firstName}!
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{projects?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {paymentPeriods?.filter((p) => p.status === "submitted").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Pending Approvals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  R{" "}
                  {projects
                    ?.reduce((sum, p) => sum + (Number(p.budget) || 0), 0)
                    .toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total Budget</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (user.role === "supervisor") {
    const project = projects?.[0];
    
    if (!project) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Project Assigned</h2>
            <p className="text-muted-foreground">
              Please contact your administrator to be assigned to a project.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Supervisor Dashboard - {project.location}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{labourers?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Total Labourers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {paymentPeriods?.filter((p) => p.status === "open").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Open Payment Periods</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">R {Number(project.budget || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Project Budget</p>
            </CardContent>
          </Card>
        </div>

        {labourers && labourers.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Recent Labourers</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {labourers.slice(0, 5).map((labourer) => (
                  <div
                    key={labourer.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div>
                      <div className="font-medium">
                        {labourer.firstName} {labourer.surname}
                      </div>
                      <div className="text-sm text-muted-foreground">{labourer.contactNumber}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (user.role === "labourer") {
    // Calculate metrics from work logs (queries hoisted to top level)
    const totalEarnings = workLogs?.reduce((sum, log) => sum + Number(log.totalEarnings || 0), 0) || 0;
    const daysWorked = workLogs?.length || 0;
    const totalMeters = workLogs?.reduce((sum, log) => 
      sum + Number(log.openTrenchingMeters || 0) + Number(log.closeTrenchingMeters || 0), 0
    ) || 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome, {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your Work Dashboard</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">R {totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{daysWorked}</div>
              <p className="text-xs text-muted-foreground">Days Worked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{totalMeters.toFixed(1)} m</div>
              <p className="text-xs text-muted-foreground">Total Meters</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Work History</h3>
          </CardHeader>
          <CardContent>
            {workLogs && workLogs.length > 0 ? (
              <div className="space-y-2">
                {workLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div>
                      <div className="font-medium">{log.workDate}</div>
                      <div className="text-sm text-muted-foreground">
                        Open: {Number(log.openTrenchingMeters || 0).toFixed(1)}m, 
                        Close: {Number(log.closeTrenchingMeters || 0).toFixed(1)}m
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">R {Number(log.totalEarnings || 0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No work logs recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Project Admin dashboard
  if (user.role === "project_admin") {
    const activeProjects = projects?.filter((p) => p.status === "active").length || 0;
    const totalBudget = projects?.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Project Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, {user.firstName}!
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{projects?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Total Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{activeProjects}</div>
              <p className="text-xs text-muted-foreground">Active Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                R {totalBudget.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </CardContent>
          </Card>
        </div>

        {projects && projects.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Your Projects</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">{project.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">R {Number(project.budget || 0).toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground capitalize">{project.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <Card>
      <CardContent className="p-12">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Welcome, {user.firstName}!</h2>
          <p className="text-muted-foreground">Your dashboard is being prepared.</p>
        </div>
      </CardContent>
    </Card>
  );
}
