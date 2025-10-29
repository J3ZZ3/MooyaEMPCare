import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, UserPlus, MapPin, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertLabourerSchema } from "@shared/schema";
import type { Project, User, Labourer, EmployeeType } from "@shared/schema";
import { format } from "date-fns";
import { validateSAId } from "@/lib/saIdValidation";

const labourerFormSchema = insertLabourerSchema
  .omit({ createdBy: true, userId: true })
  .extend({
    idNumber: z.string().refine(validateSAId, {
      message: "Invalid South African ID number",
    }),
  });

type LabourerFormData = z.infer<typeof labourerFormSchema>;

interface ProjectDetailsProps {
  user: User;
}

export default function ProjectDetails({ user }: ProjectDetailsProps) {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  const [addLabourerDialogOpen, setAddLabourerDialogOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: labourers = [], isLoading: labourersLoading } = useQuery<Labourer[]>({
    queryKey: [`/api/projects/${projectId}/labourers`],
    enabled: !!projectId,
  });

  const { data: employeeTypes = [] } = useQuery<EmployeeType[]>({
    queryKey: ["/api/employee-types"],
  });

  const { data: projectManagers = [] } = useQuery<User[]>({
    queryKey: [`/api/projects/${projectId}/managers`],
    enabled: !!projectId,
  });

  const { data: projectSupervisors = [] } = useQuery<User[]>({
    queryKey: [`/api/projects/${projectId}/supervisors`],
    enabled: !!projectId,
  });

  const { data: workLogs = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/work-logs`],
    enabled: !!projectId,
  });

  const addLabourerForm = useForm<LabourerFormData>({
    resolver: zodResolver(labourerFormSchema),
    defaultValues: {
      projectId,
      employeeTypeId: "",
      firstName: "",
      surname: "",
      idNumber: "",
      dateOfBirth: "",
      gender: "",
      contactNumber: "",
      email: "",
      physicalAddress: "",
      bankName: "",
      accountNumber: "",
      accountType: "savings",
      branchCode: "",
    },
  });

  const handleAddLabourer = async (data: LabourerFormData) => {
    try {
      await apiRequest("POST", "/api/labourers", data);

      toast({
        title: "Success",
        description: "Labourer added successfully",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/labourers`] });
      setAddLabourerDialogOpen(false);
      addLabourerForm.reset({
        projectId,
        employeeTypeId: "",
        firstName: "",
        surname: "",
        idNumber: "",
        dateOfBirth: "",
        gender: "",
        contactNumber: "",
        email: "",
        physicalAddress: "",
        bankName: "",
        accountNumber: "",
        accountType: "savings",
        branchCode: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add labourer",
        variant: "destructive",
      });
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/projects")}
          data-testid="button-back-to-projects"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Project not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage = user.role === "super_admin" || user.role === "admin" || user.role === "project_manager" || user.role === "project_admin";

  const totalMetersOpened = workLogs.reduce((sum: number, log: any) => sum + (Number(log.openTrenchingMeters) || 0), 0);
  const totalMetersClosed = workLogs.reduce((sum: number, log: any) => sum + (Number(log.closeTrenchingMeters) || 0), 0);
  const totalEarnings = workLogs.reduce((sum: number, log: any) => sum + (Number(log.totalEarnings) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/projects")}
          data-testid="button-back-to-projects"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl" data-testid="text-project-name">
                {project.name}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {project.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span data-testid="text-project-location">{project.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {format(new Date(project.createdAt!), "MMM d, yyyy")}</span>
                </div>
                {project.budget && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>R{Number(project.budget).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <Badge
              variant={project.status === "active" ? "default" : "secondary"}
              data-testid="badge-project-status"
            >
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Period:</span>
                  <span className="font-medium capitalize">{project.paymentPeriod || "fortnightly"}</span>
                </div>
                {project.defaultOpenRate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Default Opening Rate:</span>
                    <span className="font-medium">R{Number(project.defaultOpenRate).toFixed(2)}/m</span>
                  </div>
                )}
                {project.defaultCloseRate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Default Closing Rate:</span>
                    <span className="font-medium">R{Number(project.defaultCloseRate).toFixed(2)}/m</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Team</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Project Managers:</span>
                  <div className="mt-1">
                    {projectManagers.length > 0 ? (
                      projectManagers.map((pm: User) => (
                        <Badge key={pm.id} variant="outline" className="mr-2">
                          {pm.firstName} {pm.lastName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">None assigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Supervisors:</span>
                  <div className="mt-1">
                    {projectSupervisors.length > 0 ? (
                      projectSupervisors.map((sup: User) => (
                        <Badge key={sup.id} variant="outline" className="mr-2">
                          {sup.firstName} {sup.lastName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">None assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="labourers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="labourers" data-testid="tab-labourers">
            Labourers ({labourers.length})
          </TabsTrigger>
          <TabsTrigger value="progress" data-testid="tab-progress">
            Progress Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="labourers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Labourers</CardTitle>
              {canManage && (
                <Button
                  onClick={() => setAddLabourerDialogOpen(true)}
                  data-testid="button-add-labourer"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Labourer
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {labourersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : labourers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No labourers assigned to this project yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Employee Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Bank Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labourers.map((labourer) => {
                      const empType = employeeTypes.find(et => et.id === labourer.employeeTypeId);
                      return (
                        <TableRow key={labourer.id} data-testid={`row-labourer-${labourer.id}`}>
                          <TableCell className="font-medium">
                            {labourer.firstName} {labourer.surname}
                          </TableCell>
                          <TableCell>{labourer.idNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{empType?.name || "Unknown"}</Badge>
                          </TableCell>
                          <TableCell>{labourer.contactNumber}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{labourer.bankName}</div>
                              <div className="text-muted-foreground">
                                {labourer.accountNumber}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Meters Opened
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-meters-opened">
                  {totalMetersOpened.toFixed(2)} m
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Meters Closed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-meters-closed">
                  {totalMetersClosed.toFixed(2)} m
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-earnings">
                  R{totalEarnings.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Work Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Work Days Logged:</span>
                  <span className="font-medium">{workLogs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Labourers:</span>
                  <span className="font-medium">{labourers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completion Rate:</span>
                  <span className="font-medium">
                    {totalMetersOpened > 0
                      ? ((totalMetersClosed / totalMetersOpened) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addLabourerDialogOpen} onOpenChange={setAddLabourerDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Labourer to Project</DialogTitle>
            <DialogDescription>
              Add a new labourer to {project.name}
            </DialogDescription>
          </DialogHeader>

          <Form {...addLabourerForm}>
            <form onSubmit={addLabourerForm.handleSubmit(handleAddLabourer)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addLabourerForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addLabourerForm.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surname *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-surname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addLabourerForm.control}
                name="employeeTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employee-type">
                          <SelectValue placeholder="Select employee type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employeeTypes.map((type) => (
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
                control={addLabourerForm.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SA ID Number *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={13} data-testid="input-id-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addLabourerForm.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date-of-birth" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addLabourerForm.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-contact-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addLabourerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ""} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addLabourerForm.control}
                name="physicalAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Address</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-physical-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Banking Details</h4>
                
                <FormField
                  control={addLabourerForm.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-bank-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addLabourerForm.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-account-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addLabourerForm.control}
                    name="branchCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch Code *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-branch-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={addLabourerForm.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-account-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="current">Current</SelectItem>
                          <SelectItem value="transmission">Transmission</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddLabourerDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-add-labourer">
                  Add Labourer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
