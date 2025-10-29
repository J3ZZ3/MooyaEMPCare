import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Project, User } from "@shared/schema";

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

export default function Reports({ user }: ReportsProps) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [report, setReport] = useState<PayrollReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: projects = [], isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "completed");
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);

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
      const data: PayrollReport = await apiRequest(
        "GET",
        `/api/reports/payroll?projectId=${selectedProjectId}&startDate=${startDate}&endDate=${endDate}`
      );
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

  const exportToCSV = () => {
    if (!report) return;

    const headers = ["Worker Name", "ID Number", "Openings", "Closings", "Amount"];
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-reports">Generate Payroll Report</h1>
          <p className="text-muted-foreground">Select project and date range to generate payroll reports</p>
        </div>
      </div>

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
                    <TableHead className="text-right">Openings</TableHead>
                    <TableHead className="text-right">Closings</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No work logs found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {report.entries.map((entry) => (
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
                          {report.entries.reduce((sum, e) => sum + e.totalOpenMeters, 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {report.entries.reduce((sum, e) => sum + e.totalCloseMeters, 0).toFixed(2)}
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
    </div>
  );
}
