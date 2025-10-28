import StatCard from "./StatCard";
import LabourerCard from "./LabourerCard";
import { Users, Calendar, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Labourer {
  id: string;
  firstName: string;
  surname: string;
  idNumber: string;
  employeeType: string;
  contactNumber: string;
  email?: string;
  profilePhoto?: string;
}

interface SupervisorDashboardProps {
  projectName: string;
  labourers: Labourer[];
  stats: {
    totalLabourers: number;
    daysInPeriod: number;
    periodEarnings: number;
  };
  onAddLabourer: () => void;
  onEditLabourer: (id: string) => void;
  onRecordWork: () => void;
}

export default function SupervisorDashboard({
  projectName,
  labourers,
  stats,
  onAddLabourer,
  onEditLabourer,
  onRecordWork
}: SupervisorDashboardProps) {
  return (
    <div className="space-y-6" data-testid="dashboard-supervisor">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{projectName}</h1>
          <p className="text-muted-foreground">Supervisor Dashboard</p>
        </div>
        <Button onClick={onRecordWork} data-testid="button-record-work">
          <Calendar className="mr-2 h-4 w-4" />
          Record Today's Work
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Labourers"
          value={stats.totalLabourers}
          icon={Users}
        />
        <StatCard
          title="Days in Period"
          value={stats.daysInPeriod}
          icon={Calendar}
        />
        <StatCard
          title="Period Earnings"
          value={`R ${stats.periodEarnings.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Labourers</h2>
        <Button onClick={onAddLabourer} data-testid="button-add-labourer">
          <Plus className="mr-2 h-4 w-4" />
          Add Labourer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {labourers.map(labourer => (
          <LabourerCard
            key={labourer.id}
            {...labourer}
            onEdit={onEditLabourer}
          />
        ))}
      </div>
    </div>
  );
}