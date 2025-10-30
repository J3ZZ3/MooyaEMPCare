import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Project, User, Labourer } from "@shared/schema";

interface ReportsProps {
  user: User;
}

interface PayrollReportEntry {
  labourerId: string;
  labourerName: string;
  idNumber: string;
  totalOpenMeters: number;
  totalCloseMeters: number;
  totalEarnings: number;
}

interface PayrollReport {
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  paymentPeriod: string;
  openRate: number;
  closeRate: number;
  entries: PayrollReportEntry[];
  grandTotal: number;
}

interface WorkerActivityRow {
  workDate?: string;
  weekStart?: string;
  month?: string;
  labourerId: string;
  labourerName: string;
  idNumber: string;
  openMeters: number;
  closeMeters: number;
  totalMeters: number;
  earnings: number;
  daysWorked?: number;
}

interface WorkerActivityReport {
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  groupBy: string;
  data: WorkerActivityRow[];
  totals: {
    openMeters: number;
    closeMeters: number;
    totalMeters: number;
    earnings: number;
  };
}

export default function Reports({ user }: ReportsProps) {
  const { toast } = useToast();
  
  // Payroll Report State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [report, setReport] = useState<PayrollReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Worker Activity Report State
  const [activityProjectId, setActivityProjectId] = useState<string>("");
  const [activityLabourerId, setActivityLabourerId] = useState<string>("all");
  const [activityStartDate, setActivityStartDate] = useState<string>("");
  const [activityEndDate, setActivityEndDate] = useState<string>("");
  const [activityGroupBy, setActivityGroupBy] = useState<string>("daily");
  const [activityReport, setActivityReport] = useState<WorkerActivityReport | null>(null);
  const [isGeneratingActivity, setIsGeneratingActivity] = useState(false);

  const { data: projects = [], isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "completed");
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedActivityProject = projects.find(p => p.id === activityProjectId);

  // Fetch labourers for the selected activity project
  const { data: labourers = [] } = useQuery<Labourer[]>({
    queryKey: ["/api/projects", activityProjectId, "labourers"],
    enabled: !!activityProjectId,
  });

  const generateReport = async () => {
    if (!selectedProjectId || !startDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please select a project and date range",
        variant: "destructive",
      });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch(
        `/api/reports/payroll?projectId=${selectedProjectId}&startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }
      
      const data: PayrollReport = await response.json();
      setReport(data);
      toast({
        title: "Report Generated",
        description: `Found ${data.entries.length} workers with total earnings of R ${data.grandTotal.toFixed(2)}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateActivityReport = async () => {
    // CRITICAL: Dates are mandatory for accurate reporting
    if (!activityProjectId || !activityStartDate || !activityEndDate) {
      toast({
        title: "Missing Required Information",
        description: "Project and date range are required for accurate reporting",
        variant: "destructive",
      });
      return;
    }

    if (new Date(activityEndDate) < new Date(activityStartDate)) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingActivity(true);
      const params = new URLSearchParams({
        projectId: activityProjectId,
        startDate: activityStartDate,
        endDate: activityEndDate,
        groupBy: activityGroupBy,
      });
      
      if (activityLabourerId && activityLabourerId !== 'all') {
        params.append('labourerId', activityLabourerId);
      }
      
      const response = await fetch(`/api/reports/worker-activity?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to generate worker activity report");
      }
      
      const data: WorkerActivityReport = await response.json();
      setActivityReport(data);
      toast({
        title: "Report Generated",
        description: `Found ${data.data.length} ${activityGroupBy} records for the selected period`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate worker activity report",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingActivity(false);
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    const headers = ["Worker Name", "ID Number", "Open Trenches (m)", "Close Trenches (m)", "Earnings"];
    const rows = report.entries.map(entry => [
      entry.labourerName,
      entry.idNumber,
      entry.totalOpenMeters.toFixed(2),
      entry.totalCloseMeters.toFixed(2),
      `R ${entry.totalEarnings.toFixed(2)}`,
    ]);
    rows.push(["", "", "", "Total", `R ${report.grandTotal.toFixed(2)}`]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_${report.projectName}_${report.startDate}_to_${report.endDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportActivityToCSV = () => {
    if (!activityReport) return;

    let headers: string[];
    let rows: string[][];

    if (activityGroupBy === 'daily') {
      headers = ["Date", "Worker Name", "ID Number", "Open Trenches (m)", "Close Trenches (m)", "Total Trenches (m)", "Earnings"];
      rows = activityReport.data.map(row => [
        row.workDate || "",
        row.labourerName,
        row.idNumber,
        row.openMeters.toFixed(2),
        row.closeMeters.toFixed(2),
        row.totalMeters.toFixed(2),
        `R ${row.earnings.toFixed(2)}`,
      ]);
    } else if (activityGroupBy === 'weekly') {
      headers = ["Week Start", "Worker Name", "ID Number", "Days Worked", "Open Trenches (m)", "Close Trenches (m)", "Total Trenches (m)", "Earnings"];
      rows = activityReport.data.map(row => [
        row.weekStart || "",
        row.labourerName,
        row.idNumber,
        (row.daysWorked || 0).toString(),
        row.openMeters.toFixed(2),
        row.closeMeters.toFixed(2),
        row.totalMeters.toFixed(2),
        `R ${row.earnings.toFixed(2)}`,
      ]);
    } else {
      headers = ["Month", "Worker Name", "ID Number", "Days Worked", "Open Trenches (m)", "Close Trenches (m)", "Total Trenches (m)", "Earnings"];
      rows = activityReport.data.map(row => [
        row.month || "",
        row.labourerName,
        row.idNumber,
        (row.daysWorked || 0).toString(),
        row.openMeters.toFixed(2),
        row.closeMeters.toFixed(2),
        row.totalMeters.toFixed(2),
        `R ${row.earnings.toFixed(2)}`,
      ]);
    }

    rows.push([
      "TOTAL",
      "",
      "",
      ...(activityGroupBy !== 'daily' ? [""] : []),
      activityReport.totals.openMeters.toFixed(2),
      activityReport.totals.closeMeters.toFixed(2),
      activityReport.totals.totalMeters.toFixed(2),
      `R ${activityReport.totals.earnings.toFixed(2)}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `worker_activity_${activityReport.projectName}_${activityReport.startDate}_to_${activityReport.endDate}_${activityGroupBy}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-reports">Reports</h1>
          <p className="text-muted-foreground">Generate payroll summaries and worker activity reports with date-specific filtering</p>
        </div>
      </div>

      <Tabs defaultValue="payroll" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payroll" data-testid="tab-payroll">
            <FileText className="w-4 h-4 mr-2" />
            Payroll Summary
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <TrendingUp className="w-4 h-4 mr-2" />
            Worker Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-6 mt-6">

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>Choose project and payment period dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loadingProjects}
              >
                <SelectTrigger id="project" data-testid="select-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject && (
                <p className="text-xs text-muted-foreground">
                  Payment Period: {selectedProject.paymentPeriod === "fortnightly" ? "Fortnightly" : "Monthly"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={!selectedProjectId || !startDate || !endDate || isGenerating}
            className="w-full md:w-auto"
            data-testid="button-generate-report"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payroll Report</CardTitle>
                <CardDescription>
                  Period: {new Date(report.startDate).toLocaleDateString()} to {new Date(report.endDate).toLocaleDateString()}
                  <br />
                  Rates: Opening R{report.openRate} • Closing R{report.closeRate}
                </CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" data-testid="button-export-csv">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker Name</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead className="text-right">Open Trenches (m)</TableHead>
                    <TableHead className="text-right">Close Trenches (m)</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!report.entries || report.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No work logs found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {(report.entries || []).map((entry) => (
                        <TableRow key={entry.labourerId} data-testid={`row-labourer-${entry.labourerId}`}>
                          <TableCell className="font-medium">{entry.labourerName}</TableCell>
                          <TableCell className="font-mono text-sm">{entry.idNumber}</TableCell>
                          <TableCell className="text-right">{entry.totalOpenMeters.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{entry.totalCloseMeters.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            R {entry.totalEarnings.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">
                          {(report.entries || []).reduce((sum, e) => sum + e.totalOpenMeters, 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(report.entries || []).reduce((sum, e) => sum + e.totalCloseMeters, 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right" data-testid="text-grand-total">
                          R {report.grandTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Worker Activity Report</CardTitle>
              <CardDescription>⚠️ Date-specific filtering required for accurate worker activity tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activity-project">Project *</Label>
                  <Select
                    value={activityProjectId}
                    onValueChange={setActivityProjectId}
                    disabled={loadingProjects}
                  >
                    <SelectTrigger id="activity-project" data-testid="select-activity-project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity-worker">Worker</Label>
                  <Select
                    value={activityLabourerId}
                    onValueChange={setActivityLabourerId}
                    disabled={!activityProjectId}
                  >
                    <SelectTrigger id="activity-worker" data-testid="select-activity-worker">
                      <SelectValue placeholder="All workers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Workers</SelectItem>
                      {labourers.map((labourer) => (
                        <SelectItem key={labourer.id} value={labourer.id}>
                          {labourer.firstName} {labourer.surname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity-start-date">Start Date *</Label>
                  <Input
                    id="activity-start-date"
                    type="date"
                    value={activityStartDate}
                    onChange={(e) => setActivityStartDate(e.target.value)}
                    data-testid="input-activity-start-date"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity-end-date">End Date *</Label>
                  <Input
                    id="activity-end-date"
                    type="date"
                    value={activityEndDate}
                    onChange={(e) => setActivityEndDate(e.target.value)}
                    data-testid="input-activity-end-date"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="group-by">View By</Label>
                  <Select value={activityGroupBy} onValueChange={setActivityGroupBy}>
                    <SelectTrigger id="group-by" data-testid="select-group-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateActivityReport}
                  disabled={!activityProjectId || !activityStartDate || !activityEndDate || isGeneratingActivity}
                  className="mt-8"
                  data-testid="button-generate-activity"
                >
                  {isGeneratingActivity ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Report"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {activityReport && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Worker Activity - {activityGroupBy.charAt(0).toUpperCase() + activityGroupBy.slice(1)} View</CardTitle>
                    <CardDescription>
                      Period: {new Date(activityReport.startDate).toLocaleDateString()} to {new Date(activityReport.endDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button onClick={exportActivityToCSV} variant="outline" data-testid="button-export-activity-csv">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {activityGroupBy === 'daily' && <TableHead>Date</TableHead>}
                        {activityGroupBy === 'weekly' && <TableHead>Week Start</TableHead>}
                        {activityGroupBy === 'monthly' && <TableHead>Month</TableHead>}
                        <TableHead>Worker Name</TableHead>
                        <TableHead>ID Number</TableHead>
                        {activityGroupBy !== 'daily' && <TableHead className="text-right">Days Worked</TableHead>}
                        <TableHead className="text-right">Open Trenches (m)</TableHead>
                        <TableHead className="text-right">Close Trenches (m)</TableHead>
                        <TableHead className="text-right">Total Trenches (m)</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!activityReport.data || activityReport.data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={activityGroupBy === 'daily' ? 7 : 8} className="text-center text-muted-foreground">
                            No work activity found for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {activityReport.data.map((row, idx) => (
                            <TableRow key={idx} data-testid={`row-activity-${idx}`}>
                              {activityGroupBy === 'daily' && <TableCell className="font-mono text-sm">{new Date(row.workDate!).toLocaleDateString()}</TableCell>}
                              {activityGroupBy === 'weekly' && <TableCell className="font-mono text-sm">{new Date(row.weekStart!).toLocaleDateString()}</TableCell>}
                              {activityGroupBy === 'monthly' && <TableCell className="font-mono text-sm">{row.month}</TableCell>}
                              <TableCell className="font-medium">{row.labourerName}</TableCell>
                              <TableCell className="font-mono text-sm">{row.idNumber}</TableCell>
                              {activityGroupBy !== 'daily' && <TableCell className="text-right">{row.daysWorked}</TableCell>}
                              <TableCell className="text-right">{row.openMeters.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{row.closeMeters.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">{row.totalMeters.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-semibold">R {row.earnings.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={activityGroupBy === 'daily' ? 3 : 4}>Total</TableCell>
                            <TableCell className="text-right">{activityReport.totals.openMeters.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{activityReport.totals.closeMeters.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{activityReport.totals.totalMeters.toFixed(2)}</TableCell>
                            <TableCell className="text-right" data-testid="text-activity-total">
                              R {activityReport.totals.earnings.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
