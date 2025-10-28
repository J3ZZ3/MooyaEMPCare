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
import { Search, Plus, Edit, Users, Loader2 } from "lucide-react";
import { insertProjectSchema } from "@shared/schema";
import type { User, Project } from "@shared/schema";
import type { z } from "zod";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface ProjectsPageProps {
  user: User;
}

type ProjectFormData = z.infer<typeof insertProjectSchema>;

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
};

export default function ProjectsPage({ user }: ProjectsPageProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");

  const canManage = user.role === "super_admin" || user.role === "admin";
  const canAssignTeam = canManage || user.role === "project_manager";

  const addForm = useForm<ProjectFormData>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      location: "",
      budget: "",
      status: "active",
      createdBy: "",
    },
  });

  const editForm = useForm<ProjectFormData>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      location: "",
      budget: "",
      status: "active",
      createdBy: "",
    },
  });

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: teamDialogOpen && canAssignTeam,
  });

  const assignManagerMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      return apiRequest("POST", `/api/projects/${projectId}/managers`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Manager assigned",
        description: "The project manager has been assigned successfully.",
      });
      setSelectedManagerId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign manager",
        variant: "destructive",
      });
    },
  });

  const assignSupervisorMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      return apiRequest("POST", `/api/projects/${projectId}/supervisors`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Supervisor assigned",
        description: "The supervisor has been assigned successfully.",
      });
      setSelectedSupervisorId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign supervisor",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<ProjectFormData, "createdBy">) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created",
        description: "The project has been created successfully.",
      });
      setAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectFormData> }) => {
      return apiRequest("PUT", `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project updated",
        description: "The project has been updated successfully.",
      });
      setEditDialogOpen(false);
      setSelectedProject(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.location?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = (data: ProjectFormData) => {
    const { createdBy, ...projectData } = data;
    createMutation.mutate(projectData);
  };

  const handleEdit = (data: ProjectFormData) => {
    if (!selectedProject) return;
    const { createdBy, ...projectData } = data;
    updateMutation.mutate({
      id: selectedProject.id,
      data: projectData,
    });
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    editForm.reset({
      name: project.name,
      location: project.location || "",
      budget: project.budget || "",
      status: project.status,
      createdBy: project.createdBy,
    });
    setEditDialogOpen(true);
  };

  const openTeamDialog = (project: Project) => {
    setSelectedProject(project);
    setTeamDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage fibre deployment projects and teams
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              addForm.reset();
              setAddDialogOpen(true);
            }}
            data-testid="button-add-project"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Projects ({filteredProjects?.length || 0})</CardTitle>
            <div className="flex gap-4 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-projects"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects && filteredProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.location || "—"}
                    </TableCell>
                    <TableCell>
                      {project.budget ? `R ${Number(project.budget).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[project.status] || ""}>
                        {statusLabels[project.status] || project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openTeamDialog(project)}
                          data-testid={`button-team-${project.id}`}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(project)}
                            data-testid={`button-edit-${project.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "No projects found matching your filters." 
                : "No projects created yet."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent data-testid="dialog-add-project">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>
              Create a new fibre deployment project.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAdd)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Johannesburg Fibre Rollout Phase 1"
                        {...field}
                        data-testid="input-project-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Sandton, Johannesburg"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-project-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (ZAR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 5000000"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-project-budget"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-add"
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-project">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details and settings.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Johannesburg Fibre Rollout Phase 1"
                        {...field}
                        data-testid="input-edit-project-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Sandton, Johannesburg"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-project-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (ZAR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 5000000"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-project-budget"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-project-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Team Management Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-team-management">
          <DialogHeader>
            <DialogTitle>Team Management - {selectedProject?.name}</DialogTitle>
            <DialogDescription>
              Assign project managers and supervisors to this project.
            </DialogDescription>
          </DialogHeader>
          
          {canAssignTeam ? (
            <Tabs defaultValue="managers" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="managers">Project Managers</TabsTrigger>
                <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
              </TabsList>
              
              <TabsContent value="managers" className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Select 
                    value={selectedManagerId} 
                    onValueChange={setSelectedManagerId}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-manager">
                      <SelectValue placeholder="Select a manager to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.role === "project_manager").map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedProject && selectedManagerId) {
                        assignManagerMutation.mutate({
                          projectId: selectedProject.id,
                          userId: selectedManagerId,
                        });
                      }
                    }}
                    disabled={!selectedManagerId || assignManagerMutation.isPending}
                    data-testid="button-assign-manager"
                  >
                    {assignManagerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select a user with Project Manager role to assign to this project.
                </p>
              </TabsContent>
              
              <TabsContent value="supervisors" className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Select 
                    value={selectedSupervisorId} 
                    onValueChange={setSelectedSupervisorId}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-supervisor">
                      <SelectValue placeholder="Select a supervisor to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.role === "supervisor").map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedProject && selectedSupervisorId) {
                        assignSupervisorMutation.mutate({
                          projectId: selectedProject.id,
                          userId: selectedSupervisorId,
                        });
                      }
                    }}
                    disabled={!selectedSupervisorId || assignSupervisorMutation.isPending}
                    data-testid="button-assign-supervisor"
                  >
                    {assignSupervisorMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select a user with Supervisor role to assign to this project.
                </p>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              You don't have permission to manage project team assignments.
            </div>
          )}
          
          <DialogFooter>
            <Button
              onClick={() => {
                setTeamDialogOpen(false);
                setSelectedManagerId("");
                setSelectedSupervisorId("");
              }}
              data-testid="button-close-team"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
