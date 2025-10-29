import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Project, Labourer, PayRate, User } from "@shared/schema";

interface WorkLogEntry {
  labourerId: string;
  labourerName: string;
  employeeTypeId: string;
  openMeters: string;
  closeMeters: string;
  openRate: number;
  closeRate: number;
}

interface WorkLogPageProps {
  user: User;
}

export default function WorkLogPage({ user }: WorkLogPageProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [workEntries, setWorkEntries] = useState<WorkLogEntry[]>([]);
  
  // Track which project we've initialized entries for (prevents refetch resets)
  const initializedProjectRef = useRef<string>("");

  // Fetch user's supervised projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch labourers for selected project
  const { data: labourers, isLoading: labourersLoading } = useQuery<Labourer[]>({
    queryKey: selectedProjectId ? [`/api/projects/${selectedProjectId}/labourers`] : [],
    enabled: !!selectedProjectId,
  });

  // Fetch pay rates for selected project
  const { data: payRates } = useQuery<PayRate[]>({
    queryKey: selectedProjectId ? [`/api/projects/${selectedProjectId}/pay-rates`] : [],
    enabled: !!selectedProjectId,
  });

  // Initialize/update work entries when project data changes
  useEffect(() => {
    if (!selectedProjectId) {
      // Clear entries when no project selected
      setWorkEntries([]);
      initializedProjectRef.current = "";
      return;
    }

    if (!labourers || !payRates) {
      return;
    }

    // Check if this is a new project
    const isNewProject = initializedProjectRef.current !== selectedProjectId;
    
    if (isNewProject) {
      // Initialize fresh entries for new project
      const entries = labourers.map(labourer => {
        const openRate = payRates.find(
          rate => rate.employeeTypeId === labourer.employeeTypeId && rate.category === "open_trenching"
        );
        const closeRate = payRates.find(
          rate => rate.employeeTypeId === labourer.employeeTypeId && rate.category === "close_trenching"
        );

        return {
          labourerId: labourer.id,
          labourerName: `${labourer.firstName} ${labourer.surname}`,
          employeeTypeId: labourer.employeeTypeId,
          openMeters: "0",
          closeMeters: "0",
          openRate: openRate ? parseFloat(openRate.amount) : 0,
          closeRate: closeRate ? parseFloat(closeRate.amount) : 0,
        };
      });
      setWorkEntries(entries);
      initializedProjectRef.current = selectedProjectId;
    } else {
      // Merge: preserve meter inputs, update rates, add new labourers
      setWorkEntries(prevEntries => {
        const entryMap = new Map(prevEntries.map(e => [e.labourerId, e]));
        
        return labourers.map(labourer => {
          const existing = entryMap.get(labourer.id);
          const openRate = payRates.find(
            rate => rate.employeeTypeId === labourer.employeeTypeId && rate.category === "open_trenching"
          );
          const closeRate = payRates.find(
            rate => rate.employeeTypeId === labourer.employeeTypeId && rate.category === "close_trenching"
          );

          return {
            labourerId: labourer.id,
            labourerName: `${labourer.firstName} ${labourer.surname}`,
            employeeTypeId: labourer.employeeTypeId,
            // Preserve existing meter inputs or default to "0" for new labourers
            openMeters: existing?.openMeters ?? "0",
            closeMeters: existing?.closeMeters ?? "0",
            // Always use latest pay rates
            openRate: openRate ? parseFloat(openRate.amount) : 0,
            closeRate: closeRate ? parseFloat(closeRate.amount) : 0,
          };
        });
      });
    }
  }, [labourers, payRates, selectedProjectId]);

  const saveWorkLogsMutation = useMutation({
    mutationFn: async (entries: WorkLogEntry[]) => {
      const promises = entries
        .filter(entry => parseFloat(entry.openMeters) > 0 || parseFloat(entry.closeMeters) > 0)
        .map(entry => {
          const openMeters = parseFloat(entry.openMeters) || 0;
          const closeMeters = parseFloat(entry.closeMeters) || 0;
          const totalEarnings = (openMeters * entry.openRate) + (closeMeters * entry.closeRate);

          return apiRequest("POST", "/api/work-logs", {
            projectId: selectedProjectId,
            labourerId: entry.labourerId,
            workDate: format(selectedDate, "yyyy-MM-dd"),
            openTrenchingMeters: openMeters.toString(),
            closeTrenchingMeters: closeMeters.toString(),
            totalEarnings: totalEarnings.toString(),
          });
        });

      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Work logs saved",
        description: `Successfully saved work logs for ${format(selectedDate, "PPP")}`,
      });
      // Reset entries
      setWorkEntries(prev => prev.map(entry => ({ ...entry, openMeters: "0", closeMeters: "0" })));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save work logs",
        variant: "destructive",
      });
    },
  });

  const handleMeterChange = (labourerId: string, field: "openMeters" | "closeMeters", value: string) => {
    setWorkEntries(prev =>
      prev.map(entry =>
        entry.labourerId === labourerId ? { ...entry, [field]: value } : entry
      )
    );
  };

  const calculateEarnings = (entry: WorkLogEntry) => {
    const openMeters = parseFloat(entry.openMeters) || 0;
    const closeMeters = parseFloat(entry.closeMeters) || 0;
    return (openMeters * entry.openRate) + (closeMeters * entry.closeRate);
  };

  const totalDailyEarnings = workEntries.reduce((sum, entry) => sum + calculateEarnings(entry), 0);

  const handleSave = () => {
    if (!selectedProjectId) {
      toast({
        title: "No project selected",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    if (workEntries.every(e => parseFloat(e.openMeters) === 0 && parseFloat(e.closeMeters) === 0)) {
      toast({
        title: "No work entered",
        description: "Please enter at least one meter reading",
        variant: "destructive",
      });
      return;
    }

    saveWorkLogsMutation.mutate(workEntries);
  };

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily Work Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record daily opening and closing trench meters for labourers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProjectId} onValueChange={(value) => {
                setSelectedProjectId(value);
                setWorkEntries([]);
              }} disabled={projectsLoading}>
                <SelectTrigger id="project" data-testid="select-project">
                  <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Work Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-select-date">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {selectedProjectId && (
            <>
              {labourersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : workEntries.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Labourer</TableHead>
                          <TableHead className="text-right">Open Trenching (m)</TableHead>
                          <TableHead className="text-right">Close Trenching (m)</TableHead>
                          <TableHead className="text-right">Daily Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workEntries.map((entry) => (
                          <TableRow key={entry.labourerId} data-testid={`row-labourer-${entry.labourerId}`}>
                            <TableCell className="font-medium">{entry.labourerName}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={entry.openMeters}
                                onChange={(e) => handleMeterChange(entry.labourerId, "openMeters", e.target.value)}
                                className="w-28 text-right font-mono"
                                data-testid={`input-open-meters-${entry.labourerId}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={entry.closeMeters}
                                onChange={(e) => handleMeterChange(entry.labourerId, "closeMeters", e.target.value)}
                                className="w-28 text-right font-mono"
                                data-testid={`input-close-meters-${entry.labourerId}`}
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                              R {calculateEarnings(entry).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold text-right">Total Daily Earnings:</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                            R {totalDailyEarnings.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={saveWorkLogsMutation.isPending}
                      data-testid="button-save-work-log"
                    >
                      {saveWorkLogsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Work Log
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No labourers found for this project
                </div>
              )}
            </>
          )}

          {!selectedProjectId && (
            <div className="text-center py-12 text-muted-foreground">
              Select a project to start logging daily work
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Project Name</p>
              <p className="font-medium">{selectedProject.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{selectedProject.location || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Labourers</p>
              <p className="font-medium">{workEntries.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Work Date</p>
              <p className="font-medium">{format(selectedDate, "PPP")}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
