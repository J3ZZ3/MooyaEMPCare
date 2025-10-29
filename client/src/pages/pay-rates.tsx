import { useState, useEffect } from "react";
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
import { Plus, Loader2, DollarSign, History } from "lucide-react";
import { insertPayRateSchema } from "@shared/schema";
import type { User, Project, PayRate, EmployeeType } from "@shared/schema";
import type { z } from "zod";
import { format } from "date-fns";

interface PayRatesPageProps {
  user: User;
}

type PayRateFormData = z.infer<typeof insertPayRateSchema>;

const categoryLabels: Record<string, string> = {
  open_trenching: "Open Trenching",
  close_trenching: "Close Trenching",
  custom: "Custom",
};

const unitLabels: Record<string, string> = {
  per_meter: "Per Meter",
  per_day: "Per Day",
  fixed: "Fixed Amount",
};

export default function PayRatesPage({ user }: PayRatesPageProps) {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<{
    projectName: string;
    employeeTypeName: string;
    category: string;
    rates: PayRate[];
  } | null>(null);

  const canManage = 
    user.role === "super_admin" || 
    user.role === "admin" || 
    user.role === "project_manager";

  const form = useForm<PayRateFormData>({
    resolver: zodResolver(insertPayRateSchema),
    defaultValues: {
      projectId: "",
      employeeTypeId: "",
      category: "open_trenching",
      categoryName: "",
      amount: "",
      unit: "per_meter",
      effectiveDate: new Date().toISOString().split("T")[0],
      createdBy: "",
    },
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Auto-select first project when projects load
  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const { data: employeeTypes } = useQuery<EmployeeType[]>({
    queryKey: ["/api/employee-types"],
  });

  const { data: payRates, isLoading } = useQuery<PayRate[]>({
    queryKey: [`/api/projects/${selectedProjectId}/pay-rates`],
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<PayRateFormData, "createdBy">) => {
      return apiRequest("POST", "/api/pay-rates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProjectId}/pay-rates`] });
      toast({
        title: "Pay rate created",
        description: "The pay rate has been created successfully.",
      });
      setAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pay rate",
        variant: "destructive",
      });
    },
  });

  const handleAdd = (data: PayRateFormData) => {
    const { createdBy, ...rateData } = data;
    // Ensure projectId is included (it's not bound to a form control)
    const completeData = {
      ...rateData,
      projectId: selectedProjectId,
    };
    createMutation.mutate(completeData);
  };

  const viewHistory = (
    projectName: string,
    employeeTypeName: string,
    categoryLabel: string,
    categoryKey: string,
    employeeTypeId: string,
    categoryName?: string
  ) => {
    const filteredRates = payRates?.filter((r) => {
      const employeeTypeMatch = r.employeeTypeId === employeeTypeId;
      const categoryMatch = r.category === categoryKey;
      
      // For custom categories, also check categoryName to differentiate between different custom categories
      if (categoryKey === "custom" && categoryName) {
        return employeeTypeMatch && categoryMatch && r.categoryName === categoryName;
      }
      
      return employeeTypeMatch && categoryMatch;
    }) || [];
    
    setSelectedHistory({
      projectName,
      employeeTypeName,
      category: categoryLabel,
      rates: filteredRates,
    });
    setHistoryDialogOpen(true);
  };

  // Group pay rates by employee type and category
  // For custom categories, also include categoryName in the key to differentiate them
  const groupedRates = payRates?.reduce((acc, rate) => {
    const key = rate.category === "custom" && rate.categoryName
      ? `${rate.employeeTypeId}-${rate.category}-${rate.categoryName}`
      : `${rate.employeeTypeId}-${rate.category}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rate);
    return acc;
  }, {} as Record<string, PayRate[]>);

  // Get the latest rate for each employee type/category combination
  const latestRates = Object.entries(groupedRates || {}).map(([key, rates]) => {
    const sorted = rates.sort((a, b) => 
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    );
    return {
      key,
      latest: sorted[0],
      historyCount: sorted.length,
    };
  });

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pay Rates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure pay rates per project and employee type
          </p>
        </div>
        {canManage && selectedProjectId && (
          <Button
            onClick={() => {
              form.reset({
                projectId: selectedProjectId,
                employeeTypeId: "",
                category: "open_trenching",
                categoryName: "",
                amount: "",
                unit: "per_meter",
                effectiveDate: new Date().toISOString().split("T")[0],
                createdBy: "",
              });
              setAddDialogOpen(true);
            }}
            data-testid="button-add-rate"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pay Rate
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger data-testid="select-project">
              <SelectValue placeholder="Choose a project to view pay rates" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name} - {project.location || "No location"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProjectId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Pay Rates - {selectedProject?.name}
              </CardTitle>
              <Badge variant="outline">
                <DollarSign className="h-3 w-3 mr-1" />
                {latestRates.length} Active Rate{latestRates.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : latestRates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestRates.map(({ key, latest, historyCount }) => {
                    const employeeType = employeeTypes?.find(
                      (et) => et.id === latest.employeeTypeId
                    );
                    return (
                      <TableRow key={key} data-testid={`row-rate-${latest.id}`}>
                        <TableCell className="font-medium">
                          {employeeType?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {latest.category === "custom" && latest.categoryName
                            ? latest.categoryName
                            : categoryLabels[latest.category] || latest.category}
                        </TableCell>
                        <TableCell className="font-mono">
                          R {Number(latest.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {unitLabels[latest.unit] || latest.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(latest.effectiveDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {historyCount > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const categoryLabel = latest.category === "custom" && latest.categoryName
                                  ? latest.categoryName
                                  : categoryLabels[latest.category] || latest.category;
                                viewHistory(
                                  selectedProject?.name || "",
                                  employeeType?.name || "",
                                  categoryLabel,
                                  latest.category,
                                  latest.employeeTypeId,
                                  latest.categoryName || undefined
                                );
                              }}
                              data-testid={`button-history-${latest.id}`}
                            >
                              <History className="h-4 w-4 mr-2" />
                              History ({historyCount})
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No pay rates configured for this project yet.
                {canManage && " Click 'Add Pay Rate' to get started."}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Pay Rate Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent data-testid="dialog-add-rate">
          <DialogHeader>
            <DialogTitle>Add Pay Rate</DialogTitle>
            <DialogDescription>
              Create a new pay rate for {selectedProject?.name}. You can add historical rates by setting an effective date.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employee-type">
                          <SelectValue placeholder="Select employee type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employeeTypes?.filter(et => et.isActive).map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open_trenching">Open Trenching</SelectItem>
                        <SelectItem value="close_trenching">Close Trenching</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("category") === "custom" && (
                <FormField
                  control={form.control}
                  name="categoryName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Category Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Cable Installation"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-category-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (ZAR) *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g., 25.50"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            field.onChange(value);
                          }
                        }}
                        data-testid="input-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="per_meter">Per Meter</SelectItem>
                        <SelectItem value="per_day">Per Day</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-effective-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Rate
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rate History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl" data-testid="dialog-history">
          <DialogHeader>
            <DialogTitle>
              Rate History: {selectedHistory?.employeeTypeName} - {selectedHistory?.category}
            </DialogTitle>
            <DialogDescription>
              Historical pay rates for {selectedHistory?.projectName}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedHistory?.rates
                  .sort((a, b) => 
                    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
                  )
                  .map((rate, index) => (
                    <TableRow key={rate.id} data-testid={`history-row-${index}`}>
                      <TableCell className="font-medium">
                        {format(new Date(rate.effectiveDate), "MMM d, yyyy")}
                        {index === 0 && (
                          <Badge variant="default" className="ml-2">Current</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        R {Number(rate.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {unitLabels[rate.unit] || rate.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rate.createdAt ? format(new Date(rate.createdAt), "MMM d, yyyy HH:mm") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setHistoryDialogOpen(false)}
              data-testid="button-close-history"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
