import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Calendar, DollarSign, Briefcase, CheckCircle, Clock, XCircle } from "lucide-react";
import type { User as UserType, Labourer } from "@shared/schema";
import { format } from "date-fns";

interface LabourerDashboardProps {
  user: UserType;
}

export default function LabourerDashboard({ user }: LabourerDashboardProps) {
  const { data: profile, isLoading: profileLoading } = useQuery<Labourer>({
    queryKey: ["/api/my-labourer-profile"],
  });

  const { data: workLogs = [], isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ["/api/my-work-logs"],
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/my-payments"],
  });

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Profile not found. Please contact your supervisor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalEarnings = workLogs.reduce((sum: number, log: any) => sum + (Number(log.totalEarnings) || 0), 0);
  const totalOpenMeters = workLogs.reduce((sum: number, log: any) => sum + (Number(log.openTrenchingMeters) || 0), 0);
  const totalCloseMeters = workLogs.reduce((sum: number, log: any) => sum + (Number(log.closeTrenchingMeters) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">My Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          View your work history and payment information
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle data-testid="text-profile-name">
                {profile.firstName} {profile.surname}
              </CardTitle>
              <CardDescription>ID: {profile.idNumber}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Contact Number</div>
              <div className="font-medium" data-testid="text-contact-number">{profile.contactNumber}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Email</div>
              <div className="font-medium" data-testid="text-email">{profile.email || "Not provided"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Date of Birth</div>
              <div className="font-medium">{profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "MMM d, yyyy") : "Not provided"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Bank Details</div>
              <div className="font-medium">{profile.bankName} - {profile.accountNumber}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Total Work Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-work-days">
              {workLogs.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Meters Worked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-meters">
              {(totalOpenMeters + totalCloseMeters).toFixed(1)} m
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalOpenMeters.toFixed(1)}m opened, {totalCloseMeters.toFixed(1)}m closed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-earnings">
              R{totalEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="work-logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="work-logs" data-testid="tab-work-logs">
            Work History ({workLogs.length})
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            Payment Status ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work History</CardTitle>
              <CardDescription>All your recorded work activities</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : workLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No work logs recorded yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Open Trenching (m)</TableHead>
                      <TableHead className="text-right">Close Trenching (m)</TableHead>
                      <TableHead className="text-right">Total Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workLogs.map((log: any) => (
                      <TableRow key={log.id} data-testid={`row-work-log-${log.id}`}>
                        <TableCell>
                          {format(new Date(log.workDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(log.openTrenchingMeters).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(log.closeTrenchingMeters).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                          R{Number(log.totalEarnings).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>Track your payment periods and status</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No payment records available yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Open Meters</TableHead>
                      <TableHead className="text-right">Close Meters</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any) => (
                      <TableRow key={payment.entry.id} data-testid={`row-payment-${payment.entry.id}`}>
                        <TableCell>
                          <div className="font-medium">
                            {format(new Date(payment.period.startDate), "MMM d")} - {format(new Date(payment.period.endDate), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>{payment.project.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(payment.entry.openMeters).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(payment.entry.closeMeters).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                          R{Number(payment.entry.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              payment.period.status === "approved" ? "default" : 
                              payment.period.status === "pending" ? "secondary" : 
                              "outline"
                            }
                            className="gap-1"
                            data-testid={`badge-payment-status-${payment.entry.id}`}
                          >
                            {payment.period.status === "approved" && <CheckCircle className="h-3 w-3" />}
                            {payment.period.status === "pending" && <Clock className="h-3 w-3" />}
                            {payment.period.status === "rejected" && <XCircle className="h-3 w-3" />}
                            {payment.period.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
