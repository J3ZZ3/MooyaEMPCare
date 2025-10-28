import StatCard from "./StatCard";
import ProjectCard from "./ProjectCard";
import PaymentPeriodCard from "./PaymentPeriodCard";
import { Briefcase, Users, DollarSign, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Project {
  id: string;
  name: string;
  location?: string;
  budget?: number;
  status: "active" | "completed" | "on_hold";
  labourerCount: number;
  supervisorCount: number;
}

interface PaymentPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "paid";
  totalAmount: number;
  labourerCount: number;
}

interface ProjectManagerDashboardProps {
  projects: Project[];
  paymentPeriods: PaymentPeriod[];
  stats: {
    totalProjects: number;
    pendingApprovals: number;
    totalBudget: number;
    activeSupervisors: number;
  };
}

export default function ProjectManagerDashboard({
  projects,
  paymentPeriods,
  stats
}: ProjectManagerDashboardProps) {
  const handleViewProject = (id: string) => console.log('View project:', id);
  const handleViewPeriod = (id: string) => console.log('View period:', id);
  const handleApprovePeriod = (id: string) => console.log('Approve period:', id);

  return (
    <div className="space-y-6" data-testid="dashboard-project-manager">
      <div>
        <h1 className="text-2xl font-semibold">Project Manager Dashboard</h1>
        <p className="text-muted-foreground">Manage projects and approve payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Projects Managed"
          value={stats.totalProjects}
          icon={Briefcase}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          icon={Clock}
        />
        <StatCard
          title="Total Budget"
          value={`R ${stats.totalBudget.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          title="Active Supervisors"
          value={stats.activeSupervisors}
          icon={Users}
        />
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payment Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="projects" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                {...project}
                onView={handleViewProject}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentPeriods.map(period => (
              <PaymentPeriodCard
                key={period.id}
                {...period}
                onView={handleViewPeriod}
                onApprove={period.status === 'pending' ? handleApprovePeriod : undefined}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}