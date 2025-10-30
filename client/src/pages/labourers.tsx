import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/file-upload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { validateSAId, formatDateForInput } from "@/lib/saIdValidation";
import { insertLabourerSchema, type Labourer, type Project, type EmployeeType, type User } from "@shared/schema";
import { z } from "zod";
import { UserPlus, Search, Eye, Info } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

type LabourerFormData = z.infer<typeof insertLabourerSchema>;

export default function LabourersPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterEmployeeType, setFilterEmployeeType] = useState<string>("all");
  const [selectedLabourer, setSelectedLabourer] = useState<Labourer | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Get current user for authorization
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Determine if user can create labourers
  const canCreate = currentUser?.role && ["super_admin", "admin", "project_manager", "supervisor", "project_admin"].includes(currentUser.role);

  // Fetch projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch employee types
  const { data: employeeTypes, isLoading: isLoadingEmployeeTypes } = useQuery<EmployeeType[]>({
    queryKey: ["/api/employee-types"],
  });

  // Fetch labourers for all projects AND unassigned labourers
  const [allLabourers, setAllLabourers] = useState<Labourer[]>([]);
  const projectsData = projects || [];
  
  useEffect(() => {
    const fetchAllLabourers = async () => {
      // Fetch labourers from all projects
      const labourersByProject = await Promise.all(
        projectsData.map(async (project) => {
          try {
            const response = await fetch(`/api/projects/${project.id}/labourers`);
            if (response.ok) {
              return await response.json();
            }
            return [];
          } catch {
            return [];
          }
        })
      );
      
      // Fetch unassigned labourers (not assigned to any project)
      let unassignedLabourers: Labourer[] = [];
      try {
        const response = await fetch(`/api/labourers/available`);
        if (response.ok) {
          unassignedLabourers = await response.json();
        }
      } catch {
        // Silent fail - continue with just project-assigned labourers
      }
      
      // Combine all labourers (from projects + unassigned)
      const allCombined = [...labourersByProject.flat(), ...unassignedLabourers];
      
      // Remove duplicates (in case a labourer appears in both lists)
      const uniqueLabourers = Array.from(
        new Map(allCombined.map(l => [l.id, l])).values()
      );
      
      setAllLabourers(uniqueLabourers);
    };

    fetchAllLabourers();
  }, [projectsData.length]);

  const form = useForm<LabourerFormData>({
    resolver: zodResolver(insertLabourerSchema),
    defaultValues: {
      userId: undefined,
      projectId: "",
      employeeTypeId: "",
      firstName: "",
      surname: "",
      idNumber: "",
      dateOfBirth: "",
      gender: "",
      contactNumber: "",
      email: "",
      physicalAddress: "",
      profilePhotoPath: undefined,
      idDocumentPath: undefined,
      bankName: "",
      accountNumber: "",
      accountType: "cheque",
      branchCode: "",
      bankingProofPath: undefined,
      createdBy: currentUser?.id || "",
    },
  });

  // Watch ID number for auto-population (only for SA IDs, not passports)
  const idNumber = form.watch("idNumber");

  useEffect(() => {
    if (idNumber && idNumber.length >= 6) {
      const idInfo = validateSAId(idNumber);
      
      // Clear previous ID errors
      form.clearErrors("idNumber");
      
      if (idInfo.isValid) {
        // Auto-populate DOB and gender only for SA IDs (not passports)
        if (idInfo.dateOfBirth && idInfo.gender) {
          form.setValue("dateOfBirth", formatDateForInput(idInfo.dateOfBirth));
          form.setValue("gender", idInfo.gender);
        }
      } else if (idInfo.error && idNumber.length >= 9) {
        // Only show error if user has entered enough characters
        form.setError("idNumber", { message: idInfo.error });
      }
    }
  }, [idNumber, form]);

  const createMutation = useMutation({
    mutationFn: async (data: LabourerFormData) => {
      return apiRequest("POST", "/api/labourers", { ...data, createdBy: currentUser?.id });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Labourer onboarded successfully",
      });
      form.reset();
      setDialogOpen(false);
      // Refetch labourers
      const projectId = form.getValues("projectId");
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/labourers`] });
      }
      // Refresh all labourers (both assigned and unassigned)
      const fetchAllLabourers = async () => {
        // Fetch labourers from all projects
        const labourersByProject = await Promise.all(
          projectsData.map(async (project) => {
            try {
              const response = await fetch(`/api/projects/${project.id}/labourers`);
              if (response.ok) {
                return await response.json();
              }
              return [];
            } catch {
              return [];
            }
          })
        );
        
        // Fetch unassigned labourers
        let unassignedLabourers: Labourer[] = [];
        try {
          const response = await fetch(`/api/labourers/available`);
          if (response.ok) {
            unassignedLabourers = await response.json();
          }
        } catch {
          // Silent fail
        }
        
        // Combine and deduplicate
        const allCombined = [...labourersByProject.flat(), ...unassignedLabourers];
        const uniqueLabourers = Array.from(
          new Map(allCombined.map(l => [l.id, l])).values()
        );
        
        setAllLabourers(uniqueLabourers);
      };
      fetchAllLabourers();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to onboard labourer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LabourerFormData) => {
    createMutation.mutate(data);
  };

  // Filter labourers
  const filteredLabourers = allLabourers.filter((labourer) => {
    const matchesSearch = 
      `${labourer.firstName} ${labourer.surname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      labourer.idNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      labourer.contactNumber.includes(searchQuery);
    
    const matchesProject = filterProject === "all" || labourer.projectId === filterProject;
    const matchesEmployeeType = filterEmployeeType === "all" || labourer.employeeTypeId === filterEmployeeType;
    
    return matchesSearch && matchesProject && matchesEmployeeType;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-labourers">Labourers</h1>
          <p className="text-muted-foreground">Manage labourer onboarding and information</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-labourer">
                <UserPlus className="h-4 w-4 mr-2" />
                Onboard Labourer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Onboard New Labourer</DialogTitle>
              </DialogHeader>
              
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                  A login account will be automatically created for this labourer. They can log in using their <strong>contact number or email</strong> as username and <strong>ID number/passport</strong> as password.
                </AlertDescription>
              </Alert>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Project Selection */}
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-project">
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projects?.map((project) => (
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

                    {/* Employee Type */}
                    <FormField
                      control={form.control}
                      name="employeeTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingEmployeeTypes}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee-type">
                                <SelectValue placeholder={isLoadingEmployeeTypes ? "Loading..." : "Select employee type"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingEmployeeTypes ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading employee types...</div>
                              ) : employeeTypes && employeeTypes.length > 0 ? (
                                employeeTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-muted-foreground">No employee types found</div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* First Name */}
                    <FormField
                      control={form.control}
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

                    {/* Surname */}
                    <FormField
                      control={form.control}
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

                    {/* ID Number */}
                    <FormField
                      control={form.control}
                      name="idNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SA ID Number / Passport *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="13-digit SA ID or passport"
                              data-testid="input-id-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date of Birth (auto-populated) */}
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              value={field.value || ""}
                              data-testid="input-dob"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Gender (auto-populated) */}
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Contact Number */}
                    <FormField
                      control={form.control}
                      name="contactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="+27 or 0 followed by 9 digits"
                              data-testid="input-contact"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (for login)</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="Optional" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Physical Address */}
                  <FormField
                    control={form.control}
                    name="physicalAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physical Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Banking Details Section */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Banking Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
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

                      <FormField
                        control={form.control}
                        name="accountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-account-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cheque">Cheque</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                  </div>

                  {/* File Uploads Section */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Documents</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="profilePhotoPath"
                        render={({ field }) => (
                          <FormItem>
                            <FileUpload
                              label="Profile Photo"
                              accept="image/*"
                              maxFileSize={5 * 1024 * 1024}
                              onUploadComplete={(path) => field.onChange(path || undefined)}
                              currentFilePath={field.value || undefined}
                              testId="upload-profile-photo"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="idDocumentPath"
                        render={({ field }) => (
                          <FormItem>
                            <FileUpload
                              label="ID Document"
                              accept="image/*,.pdf"
                              maxFileSize={10 * 1024 * 1024}
                              onUploadComplete={(path) => field.onChange(path || undefined)}
                              currentFilePath={field.value || undefined}
                              testId="upload-id-document"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bankingProofPath"
                        render={({ field }) => (
                          <FormItem>
                            <FileUpload
                              label="Banking Proof"
                              accept="image/*,.pdf"
                              maxFileSize={10 * 1024 * 1024}
                              onUploadComplete={(path) => field.onChange(path || undefined)}
                              currentFilePath={field.value || undefined}
                              testId="upload-banking-proof"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createMutation.isPending ? "Onboarding..." : "Onboard Labourer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, ID, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger data-testid="select-filter-project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Employee Type</label>
              <Select value={filterEmployeeType} onValueChange={setFilterEmployeeType}>
                <SelectTrigger data-testid="select-filter-employee-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {employeeTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labourers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Labourers ({filteredLabourers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Employee Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLabourers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No labourers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLabourers.map((labourer) => {
                  const project = projects?.find((p) => p.id === labourer.projectId);
                  const employeeType = employeeTypes?.find((t) => t.id === labourer.employeeTypeId);

                  return (
                    <TableRow key={labourer.id} data-testid={`row-labourer-${labourer.id}`}>
                      <TableCell className="font-medium">
                        {labourer.firstName} {labourer.surname}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{labourer.idNumber}</TableCell>
                      <TableCell>{labourer.contactNumber}</TableCell>
                      <TableCell>{project?.name || "-"}</TableCell>
                      <TableCell>{employeeType?.name || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLabourer(labourer);
                            setViewDialogOpen(true);
                          }}
                          data-testid={`button-view-${labourer.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Labourer Dialog */}
      {selectedLabourer && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedLabourer.firstName} {selectedLabourer.surname}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID Number</p>
                  <p className="font-medium">{selectedLabourer.idNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {selectedLabourer.dateOfBirth
                      ? format(new Date(selectedLabourer.dateOfBirth), "MMM d, yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{selectedLabourer.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <p className="font-medium">{selectedLabourer.contactNumber}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedLabourer.email || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Physical Address</p>
                  <p className="font-medium">{selectedLabourer.physicalAddress || "-"}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Banking Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bank</p>
                    <p className="font-medium">{selectedLabourer.bankName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                    <p className="font-medium capitalize">{selectedLabourer.accountType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                    <p className="font-medium">{selectedLabourer.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Branch Code</p>
                    <p className="font-medium">{selectedLabourer.branchCode}</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
