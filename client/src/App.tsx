import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import EmployeeTypesPage from "@/pages/employee-types";
import ProjectsPage from "@/pages/projects";
import ProjectDetails from "@/pages/project-details";
import PayRatesPage from "@/pages/pay-rates";
import LabourersPage from "@/pages/labourers";
import Reports from "@/pages/reports";
import WorkLogPage from "@/pages/work-log";
import PaymentsPage from "@/pages/payments";
import AuditPage from "@/pages/audit";
import RolesPage from "@/pages/roles";
import LabourerDashboard from "@/pages/labourer-dashboard";
import LabourerLogin from "@/pages/labourer-login";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

function LoginPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <h1 className="text-3xl font-bold">Mooya EMPCare</h1>
          <p className="text-muted-foreground">Fibre Deployment Management Tool</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleLogin}
            className="w-full"
            size="lg"
            data-testid="button-login"
          >
            Sign in with Google
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Access restricted to @mooya.co.za and @mooyawireless.co.za email addresses
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthenticatedApp({ user }: { user: User }) {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userRole={user.role}
          userName={`${user.firstName} ${user.lastName}`}
          userEmail={user.email || ""}
          currentPath={window.location.pathname}
          onNavigate={(path) => (window.location.href = path)}
          onLogout={() => {
            window.location.href = "/api/logout";
          }}
        />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              <Switch>
                <Route path="/" component={() => user.role === "labourer" ? <LabourerDashboard user={user} /> : <Dashboard user={user} />} />
                <Route path="/dashboard" component={() => user.role === "labourer" ? <LabourerDashboard user={user} /> : <Dashboard user={user} />} />
                <Route path="/users" component={() => <UsersPage user={user} />} />
                <Route path="/employee-types" component={() => <EmployeeTypesPage user={user} />} />
                <Route path="/projects/:id" component={() => <ProjectDetails user={user} />} />
                <Route path="/projects" component={() => <ProjectsPage user={user} />} />
                <Route path="/pay-rates" component={() => <PayRatesPage user={user} />} />
                <Route path="/labourers" component={LabourersPage} />
                <Route path="/reports" component={() => <Reports user={user} />} />
                <Route path="/work-log" component={() => <WorkLogPage user={user} />} />
                <Route path="/payments" component={() => <PaymentsPage user={user} />} />
                <Route path="/audit" component={() => <AuditPage user={user} />} />
                <Route path="/roles" component={RolesPage} />
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const [location] = useLocation();
  
  // Check if we're on labourer routes (don't query /api/user for these)
  const isLabourerRoute = location === "/labourer-login" || location === "/labourer-dashboard";
  
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: !isLabourerRoute, // Only query for staff routes
  });

  // Public labourer login route
  if (location === "/labourer-login") {
    return <LabourerLogin />;
  }

  // Protected labourer dashboard route - labourer auth handled by backend APIs
  if (location === "/labourer-dashboard") {
    return <LabourerDashboard user={null} />;
  }

  // Staff routes - require OIDC authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp user={user} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
