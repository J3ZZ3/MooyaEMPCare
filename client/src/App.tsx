import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/components/LoginPage";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import ProjectManagerDashboard from "@/components/ProjectManagerDashboard";
import SupervisorDashboard from "@/components/SupervisorDashboard";
import LabourerDashboard from "@/components/LabourerDashboard";
import DailyWorkSheet from "@/components/DailyWorkSheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRole = "super_admin" | "admin" | "project_manager" | "supervisor" | "project_admin" | "labourer";

//todo: remove mock functionality
const mockUsers = {
  project_manager: {
    name: "Sarah Johnson",
    email: "sarah.johnson@mooya.co.za",
    role: "project_manager" as UserRole
  },
  supervisor: {
    name: "David Mthembu",
    email: "david.mthembu@mooya.co.za",
    role: "supervisor" as UserRole
  },
  labourer: {
    name: "Thabo Mthembu",
    email: "thabo.m@mooya.co.za",
    role: "labourer" as UserRole
  }
};

//todo: remove mock functionality
const mockProjects = [
  {
    id: '1',
    name: 'BPM 605',
    location: 'Somerset East',
    budget: 250000,
    status: 'active' as const,
    labourerCount: 24,
    supervisorCount: 2
  },
  {
    id: '2',
    name: 'Fibre Deployment Phase 2',
    location: 'Port Elizabeth',
    budget: 180000,
    status: 'active' as const,
    labourerCount: 18,
    supervisorCount: 1
  },
  {
    id: '3',
    name: 'Network Extension',
    location: 'Grahamstown',
    status: 'on_hold' as const,
    labourerCount: 0,
    supervisorCount: 1
  }
];

//todo: remove mock functionality
const mockPaymentPeriods = [
  {
    id: '1',
    startDate: 'Dec 1',
    endDate: 'Dec 14',
    status: 'pending' as const,
    totalAmount: 45230,
    labourerCount: 24
  },
  {
    id: '2',
    startDate: 'Nov 15',
    endDate: 'Nov 28',
    status: 'approved' as const,
    totalAmount: 38750,
    labourerCount: 22
  }
];

//todo: remove mock functionality
const mockLabourers = [
  {
    id: '1',
    firstName: 'Thabo',
    surname: 'Mthembu',
    idNumber: '9012155678901',
    employeeType: 'Civil Worker - Trenching',
    contactNumber: '+27 82 345 6789',
    email: 'thabo.m@example.com'
  },
  {
    id: '2',
    firstName: 'Sipho',
    surname: 'Ndlovu',
    idNumber: '8506123456789',
    employeeType: 'Flagman',
    contactNumber: '+27 71 234 5678'
  },
  {
    id: '3',
    firstName: 'Mandla',
    surname: 'Khumalo',
    idNumber: '9305087654321',
    employeeType: 'Civil Worker - Trenching',
    contactNumber: '+27 83 456 7890',
    email: 'mandla.k@example.com'
  }
];

//todo: remove mock functionality
const mockWorkHistory = [
  { date: 'Dec 10, 2025', openMeters: 15.5, closeMeters: 12.0, earnings: 627.50, status: 'pending' as const },
  { date: 'Dec 9, 2025', openMeters: 18.0, closeMeters: 15.5, earnings: 760.00, status: 'pending' as const },
  { date: 'Dec 8, 2025', openMeters: 14.0, closeMeters: 11.0, earnings: 570.00, status: 'pending' as const },
  { date: 'Dec 5, 2025', openMeters: 16.5, closeMeters: 13.5, earnings: 682.50, status: 'approved' as const },
  { date: 'Dec 4, 2025', openMeters: 17.0, closeMeters: 14.0, earnings: 705.00, status: 'approved' as const },
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<typeof mockUsers[keyof typeof mockUsers]>(mockUsers.project_manager);
  const [currentPath, setCurrentPath] = useState("/dashboard");

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPath("/dashboard");
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleRoleChange = (role: string) => {
    setCurrentUser(mockUsers[role as keyof typeof mockUsers]);
    setCurrentPath("/dashboard");
  };

  if (!isLoggedIn) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginPage onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar
              userRole={currentUser.role}
              userName={currentUser.name}
              userEmail={currentUser.email}
              currentPath={currentPath}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-3">
                  {/* Demo role switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Demo as:</span>
                    <Select value={Object.keys(mockUsers).find(k => mockUsers[k as keyof typeof mockUsers].role === currentUser.role)} onValueChange={handleRoleChange}>
                      <SelectTrigger className="w-48" data-testid="select-demo-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="labourer">Labourer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto p-6">
                <div className="max-w-7xl mx-auto">
                  {currentUser.role === "project_manager" && currentPath === "/dashboard" && (
                    <ProjectManagerDashboard
                      projects={mockProjects}
                      paymentPeriods={mockPaymentPeriods}
                      stats={{
                        totalProjects: 8,
                        pendingApprovals: 2,
                        totalBudget: 1250000,
                        activeSupervisors: 5
                      }}
                    />
                  )}
                  {currentUser.role === "supervisor" && currentPath === "/dashboard" && (
                    <SupervisorDashboard
                      projectName="BPM 605"
                      labourers={mockLabourers}
                      stats={{
                        totalLabourers: 24,
                        daysInPeriod: 10,
                        periodEarnings: 45230
                      }}
                      onAddLabourer={() => console.log('Add labourer')}
                      onEditLabourer={(id) => console.log('Edit labourer:', id)}
                      onRecordWork={() => setCurrentPath('/work-log')}
                    />
                  )}
                  {currentUser.role === "supervisor" && currentPath === "/work-log" && (
                    <DailyWorkSheet
                      projectName="BPM 605"
                      labourers={mockLabourers.map(l => ({
                        labourerId: l.id,
                        labourerName: `${l.firstName} ${l.surname}`,
                        openMeters: 0,
                        closeMeters: 0,
                        openRate: 25,
                        closeRate: 20
                      }))}
                      onSave={(date, entries) => {
                        console.log('Saved work sheet:', date, entries);
                        setCurrentPath('/dashboard');
                      }}
                    />
                  )}
                  {currentUser.role === "labourer" && (
                    <LabourerDashboard
                      labourerName={currentUser.name}
                      currentPeriodEarnings={3345.00}
                      daysWorked={5}
                      nextPaymentDate="Dec 15"
                      totalMeters={147.0}
                      workHistory={mockWorkHistory}
                    />
                  )}
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;