import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StatCard from "./StatCard";
import { DollarSign, Calendar, TrendingUp, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "./StatusBadge";

interface WorkRecord {
  date: string;
  openMeters: number;
  closeMeters: number;
  earnings: number;
  status: "pending" | "approved" | "paid";
}

interface LabourerDashboardProps {
  labourerName: string;
  currentPeriodEarnings: number;
  daysWorked: number;
  nextPaymentDate: string;
  totalMeters: number;
  workHistory: WorkRecord[];
}

export default function LabourerDashboard({
  labourerName,
  currentPeriodEarnings,
  daysWorked,
  nextPaymentDate,
  totalMeters,
  workHistory
}: LabourerDashboardProps) {
  return (
    <div className="space-y-6" data-testid="dashboard-labourer">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {labourerName}</h1>
        <p className="text-muted-foreground">Track your work and earnings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Period Earnings"
          value={`R ${currentPeriodEarnings.toLocaleString()}`}
          icon={DollarSign}
          subtitle="14-day period"
        />
        <StatCard
          title="Days Worked"
          value={daysWorked}
          icon={Calendar}
          subtitle="This period"
        />
        <StatCard
          title="Total Meters"
          value={totalMeters}
          icon={TrendingUp}
          subtitle="This period"
        />
        <StatCard
          title="Next Payment"
          value={nextPaymentDate}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Work History</h2>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Open (m)</TableHead>
                  <TableHead className="text-right">Close (m)</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workHistory.map((record, index) => (
                  <TableRow key={index} data-testid={`row-work-${index}`}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell className="text-right font-mono">{record.openMeters.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{record.closeMeters.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      R {record.earnings.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}