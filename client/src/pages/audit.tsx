import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Plus, Loader2, CheckCircle, XCircle, FileText, Clock } from "lucide-react";
import { insertCorrectionRequestSchema } from "@shared/schema";
import type { User, CorrectionRequest, AuditLog } from "@shared/schema";
import type { z } from "zod";
import { format, parseISO } from "date-fns";

interface AuditPageProps {
  user: User;
}

type CorrectionRequestFormData = z.infer<typeof insertCorrectionRequestSchema>;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ASSIGN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  SUBMIT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  APPROVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REJECT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AuditPage({ user }: AuditPageProps) {
  const { toast } = useToast();
  const canCreate = true; // All authenticated users can create correction requests
  const canReview = user.role === "super_admin" || user.role === "admin" || user.role === "project_manager";
  const canViewAudit = user.role === "super_admin" || user.role === "admin";
  
  const [activeTab, setActiveTab] = useState<"audit" | "corrections">(canViewAudit ? "audit" : "corrections");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [reviewNotes, setReviewNotes] = useState("");

  const createForm = useForm<CorrectionRequestFormData>({
    resolver: zodResolver(insertCorrectionRequestSchema),
    defaultValues: {
      entityType: "",
      entityId: "",
      fieldName: "",
      oldValue: "",
      newValue: "",
      reason: "",
      requestedBy: "",
    },
  });

  const { data: auditLogs, isLoading: isLoadingAudit } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
    enabled: canViewAudit,
  });

  const { data: requests, isLoading: isLoadingCorrections } = useQuery<CorrectionRequest[]>({
    queryKey: ["/api/correction-requests"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CorrectionRequestFormData) => {
      // Populate requestedBy with current user ID
      const payload = {
        ...data,
        requestedBy: user.id,
      };
      return apiRequest("POST", "/api/correction-requests", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/correction-requests"] });
      toast({
        title: "Success",
        description: "Correction request submitted successfully",
      });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create correction request",
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      return apiRequest("PUT", `/api/correction-requests/${id}`, {
        status,
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
        reviewNotes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/correction-requests"] });
      toast({
        title: "Success",
        description: "Correction request reviewed successfully",
      });
      setReviewDialogOpen(false);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to review correction request",
        variant: "destructive",
      });
    },
  });

  const filteredRequests = requests?.filter(request => {
    if (selectedStatus !== "all" && request.status !== selectedStatus) return false;
    return true;
  }) || [];

  const handleViewDetails = (request: CorrectionRequest) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const handleReview = (request: CorrectionRequest) => {
    setSelectedRequest(request);
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    reviewMutation.mutate({
      id: selectedRequest.id,
      status: "approved",
      notes: reviewNotes,
    });
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    reviewMutation.mutate({
      id: selectedRequest.id,
      status: "rejected",
      notes: reviewNotes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">
            {activeTab === "audit" 
              ? "Comprehensive system activity log with automatic change tracking"
              : "Track and manage data correction requests"}
          </p>
        </div>
        {activeTab === "corrections" && canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-request">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {canViewAudit && (
          <Button
            variant={activeTab === "audit" ? "default" : "ghost"}
            onClick={() => setActiveTab("audit")}
            className="rounded-b-none"
            data-testid="tab-audit"
          >
            System Audit Log
          </Button>
        )}
        <Button
          variant={activeTab === "corrections" ? "default" : "ghost"}
          onClick={() => setActiveTab("corrections")}
          className="rounded-b-none"
          data-testid="tab-corrections"
        >
          Correction Requests
        </Button>
      </div>

      {/* Audit Log Table */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle>System Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAudit ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No audit logs found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map(log => (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {log.createdAt && format(typeof log.createdAt === 'string' ? parseISO(log.createdAt) : log.createdAt, "MMM d, yyyy HH:mm")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action]} data-testid={`action-${log.id}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.entityType}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">{log.entityId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.userName || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{log.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs truncate">
                          {log.changes && typeof log.changes === 'object' 
                            ? Object.entries(log.changes as Record<string, any>).slice(0, 2).map(([key, value]) => (
                                <div key={key} className="truncate">
                                  <span className="font-medium">{key}:</span> {JSON.stringify(value).slice(0, 50)}
                                </div>
                              ))
                            : 'No details'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Correction Requests Section */}
      {activeTab === "corrections" && (
        <>
          <div className="flex gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Correction Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCorrections ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No correction requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(request => (
                  <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                    <TableCell className="font-medium">
                      {request.entityType}
                    </TableCell>
                    <TableCell>{request.fieldName}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        <span className="text-muted-foreground line-through">{request.oldValue || "N/A"}</span>
                        {" → "}
                        <span className="font-medium">{request.newValue}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[request.status]} data-testid={`status-${request.id}`}>
                        {statusLabels[request.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {request.requestedAt && format(typeof request.requestedAt === 'string' ? parseISO(request.requestedAt) : request.requestedAt, "MMM d, yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                          data-testid={`button-view-${request.id}`}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                        {canReview && request.status === "pending" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleReview(request)}
                            data-testid={`button-review-${request.id}`}
                          >
                            Review
                          </Button>
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
        </>
      )}

      {/* Create Correction Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-request">
          <DialogHeader>
            <DialogTitle>Create Correction Request</DialogTitle>
            <DialogDescription>
              Request a change to existing data with proper approval workflow
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createForm.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-entity-type">
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="work_log">Work Log</SelectItem>
                        <SelectItem value="labourer">Labourer</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="payment_period">Payment Period</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter entity ID" {...field} data-testid="input-entity-id" />
                    </FormControl>
                    <FormDescription>
                      The ID of the record you want to change
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="fieldName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., openTrenchingMeters" {...field} data-testid="input-field-name" />
                    </FormControl>
                    <FormDescription>
                      The name of the field to change
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="oldValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Value</FormLabel>
                    <FormControl>
                      <Input placeholder="Current value" {...field} value={field.value || ""} data-testid="input-old-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="newValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Value</FormLabel>
                    <FormControl>
                      <Input placeholder="Desired new value" {...field} data-testid="input-new-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Change</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why this change is needed"
                        {...field}
                        data-testid="input-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent data-testid="dialog-request-details">
          <DialogHeader>
            <DialogTitle>Correction Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedRequest.status]}>
                    {statusLabels[selectedRequest.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested</p>
                  <p>{selectedRequest.requestedAt && format(typeof selectedRequest.requestedAt === 'string' ? parseISO(selectedRequest.requestedAt) : selectedRequest.requestedAt, "MMM d, yyyy HH:mm")}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Entity</p>
                <p className="font-medium">{selectedRequest.entityType} (ID: {selectedRequest.entityId})</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Field</p>
                <p className="font-medium">{selectedRequest.fieldName}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Change</p>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <span className="text-muted-foreground line-through">{selectedRequest.oldValue || "N/A"}</span>
                    {" → "}
                    <span className="font-medium text-primary">{selectedRequest.newValue}</span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="text-sm">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.reviewedBy && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Reviewed</p>
                    <p>{selectedRequest.reviewedAt ? format(typeof selectedRequest.reviewedAt === 'string' ? parseISO(selectedRequest.reviewedAt) : selectedRequest.reviewedAt, "MMM d, yyyy HH:mm") : "N/A"}</p>
                  </div>
                  {selectedRequest.reviewNotes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Review Notes</p>
                      <p className="text-sm">{selectedRequest.reviewNotes}</p>
                    </div>
                  )}
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

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent data-testid="dialog-review-request">
          <DialogHeader>
            <DialogTitle>Review Correction Request</DialogTitle>
            <DialogDescription>
              Approve or reject this data change request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Change</p>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-mono">
                    <span className="text-muted-foreground line-through">{selectedRequest.oldValue || "N/A"}</span>
                    {" → "}
                    <span className="font-medium text-primary">{selectedRequest.newValue}</span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="text-sm">{selectedRequest.reason}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Review Notes (optional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about your decision"
                  data-testid="input-review-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setReviewNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={reviewMutation.isPending}
              data-testid="button-reject-review"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={reviewMutation.isPending}
              data-testid="button-approve-review"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
