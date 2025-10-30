import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Loader2, CheckCircle, XCircle, Send, Calendar, DollarSign } from "lucide-react";
import { insertPaymentPeriodSchema } from "@shared/schema";
import type { User, Project, PaymentPeriod, PaymentPeriodEntry, Labourer } from "@shared/schema";
import type { z } from "zod";
import { format, parseISO } from "date-fns";

interface PaymentsPageProps {
  user: User;
}

type PaymentPeriodFormData = z.infer<typeof insertPaymentPeriodSchema>;

const statusColors: Record<string, string> = {
  open: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  paid: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

export default function PaymentsPage({ user }: PaymentsPageProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PaymentPeriod | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const canCreate = user.role === "super_admin" || user.role === "admin" || user.role === "project_manager";
  const canApprove = user.role === "super_admin" || user.role === "admin" || user.role === "project_manager";
  const canSubmit = true; // Any authenticated user can submit

  const createForm = useForm<PaymentPeriodFormData>({
    resolver: zodResolver(insertPaymentPeriodSchema),
    defaultValues: {
      projectId: "",
      startDate: "",
      endDate: "",
    },
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Get all payment periods across all projects
  const { data: allPeriods, isLoading } = useQuery<PaymentPeriod[]>({
    queryKey: ["/api/payment-periods/all"],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];
      
      const periodPromises = projects.map(project =>
        fetch(`/api/projects/${project.id}/payment-periods`)
          .then(res => res.ok ? res.json() : [])
      );
      
      const results = await Promise.all(periodPromises);
      return results.flat();
    },
    enabled: !!projects,
  });

  const { data: entries } = useQuery<(PaymentPeriodEntry & { labourer?: Labourer })[]>({
    queryKey: ["/api/payment-periods", selectedPeriod?.id, "entries"],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      const response = await fetch(`/api/payment-periods/${selectedPeriod.id}/entries`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPeriod && detailsDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: PaymentPeriodFormData) => {
      // Backend will auto-calculate totalAmount from work logs
      return apiRequest("POST", "/api/payment-periods", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-periods/all"] });
      toast({
        title: "Success",
        description: "Payment period created successfully",
      });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment period",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, userId }: { id: string; status: string; userId: string }) => {
      const updateData: any = { status };
      
      if (status === "submitted") {
        updateData.submittedBy = userId;
        updateData.submittedAt = new Date().toISOString();
      } else if (status === "approved") {
        updateData.approvedBy = userId;
        updateData.approvedAt = new Date().toISOString();
      }
      
      return apiRequest("PUT", `/api/payment-periods/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-periods/all"] });
      toast({
        title: "Success",
        description: "Payment period status updated successfully",
      });
      setDetailsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment period",
        variant: "destructive",
      });
    },
  });

  const filteredPeriods = allPeriods?.filter(period => {
    if (selectedProjectId !== "all" && period.projectId !== selectedProjectId) return false;
    if (selectedStatus !== "all" && period.status !== selectedStatus) return false;
    return true;
  }) || [];

  const getProjectName = (projectId: string) => {
    return projects?.find(p => p.id === projectId)?.name || "Unknown Project";
  };

  const handleViewDetails = (period: PaymentPeriod) => {
    setSelectedPeriod(period);
    setDetailsDialogOpen(true);
  };

  const handleSubmit = (period: PaymentPeriod) => {
    updateStatusMutation.mutate({
      id: period.id,
      status: "submitted",
      userId: user.id,
    });
  };

  const handleApprove = (period: PaymentPeriod) => {
    updateStatusMutation.mutate({
      id: period.id,
      status: "approved",
      userId: user.id,
    });
  };

  const handleReject = (period: PaymentPeriod) => {
    updateStatusMutation.mutate({
      id: period.id,
      status: "rejected",
      userId: user.id,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Periods</h1>
          <p className="text-muted-foreground">Manage fortnightly payment cycles and approvals</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-period">
            <Plus className="mr-2 h-4 w-4" />
            Create Period
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-64" data-testid="select-project-filter">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Periods</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPeriods.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No payment periods found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeriods.map(period => (
                  <TableRow key={period.id} data-testid={`row-period-${period.id}`}>
                    <TableCell className="font-medium">
                      {getProjectName(period.projectId)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(parseISO(period.startDate), "MMM d, yyyy")} - {format(parseISO(period.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[period.status]} data-testid={`status-${period.id}`}>
                        {statusLabels[period.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      R {parseFloat(period.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(period)}
                          data-testid={`button-view-${period.id}`}
                        >
                          View Details
                        </Button>
                        {canSubmit && period.status === "open" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSubmit(period)}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-submit-${period.id}`}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Submit
                          </Button>
                        )}
                        {canApprove && period.status === "submitted" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(period)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-${period.id}`}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(period)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-reject-${period.id}`}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Period Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-period">
          <DialogHeader>
            <DialogTitle>Create Payment Period</DialogTitle>
            <DialogDescription>
              Create a new payment period for tracking worker earnings
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> The total amount will be automatically calculated from work logs in this date range.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Period
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Period Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl" data-testid="dialog-period-details">
          <DialogHeader>
            <DialogTitle>Payment Period Details</DialogTitle>
            <DialogDescription>
              {selectedPeriod && (
                <>
                  {getProjectName(selectedPeriod.projectId)} | {format(parseISO(selectedPeriod.startDate), "MMM d, yyyy")} - {format(parseISO(selectedPeriod.endDate), "MMM d, yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPeriod && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedPeriod.status]}>
                    {statusLabels[selectedPeriod.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    R {entries ? entries.reduce((sum, entry) => sum + parseFloat(entry.totalEarnings), 0).toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>

              {entries && entries.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Payment Entries</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Labourer</TableHead>
                        <TableHead>Days Worked</TableHead>
                        <TableHead>Total Meters</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.labourerId}</TableCell>
                          <TableCell>{entry.daysWorked}</TableCell>
                          <TableCell>{parseFloat(entry.totalMeters).toFixed(2)}m</TableCell>
                          <TableCell className="text-right font-mono">
                            R {parseFloat(entry.totalEarnings).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
