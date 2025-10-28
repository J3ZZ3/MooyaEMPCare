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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { insertEmployeeTypeSchema } from "@shared/schema";
import type { User, EmployeeType } from "@shared/schema";
import type { z } from "zod";

interface EmployeeTypesPageProps {
  user: User;
}

type EmployeeTypeFormData = z.infer<typeof insertEmployeeTypeSchema>;

export default function EmployeeTypesPage({ user }: EmployeeTypesPageProps) {
  // Check authorization - only super_admin and admin can access
  const canManage = user.role === "super_admin" || user.role === "admin";

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EmployeeType | null>(null);

  const addForm = useForm<EmployeeTypeFormData>({
    resolver: zodResolver(insertEmployeeTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const editForm = useForm<EmployeeTypeFormData>({
    resolver: zodResolver(insertEmployeeTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const { data: employeeTypes, isLoading } = useQuery<EmployeeType[]>({
    queryKey: ["/api/employee-types"],
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeTypeFormData) => {
      return apiRequest("POST", "/api/employee-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-types"] });
      toast({
        title: "Employee type created",
        description: "The employee type has been created successfully.",
      });
      setAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee type",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmployeeTypeFormData> }) => {
      return apiRequest("PUT", `/api/employee-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-types"] });
      toast({
        title: "Employee type updated",
        description: "The employee type has been updated successfully.",
      });
      setEditDialogOpen(false);
      setSelectedType(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee type",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/employee-types/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-types"] });
      toast({
        title: "Employee type deactivated",
        description: "The employee type has been deactivated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate employee type",
        variant: "destructive",
      });
    },
  });

  const filteredTypes = employeeTypes?.filter((type) =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = (data: EmployeeTypeFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (data: EmployeeTypeFormData) => {
    if (!selectedType) return;
    updateMutation.mutate({
      id: selectedType.id,
      data,
    });
  };

  const openEditDialog = (type: EmployeeType) => {
    setSelectedType(type);
    editForm.reset({
      name: type.name,
      description: type.description || "",
      isActive: type.isActive,
    });
    setEditDialogOpen(true);
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
          <h1 className="text-2xl font-semibold">Employee Types</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage worker categories and roles
          </p>
        </div>
        <Button
          onClick={() => {
            addForm.reset();
            setAddDialogOpen(true);
          }}
          data-testid="button-add-employee-type"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Employee Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Employee Types ({filteredTypes?.length || 0})</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-employee-types"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTypes && filteredTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map((type) => (
                  <TableRow key={type.id} data-testid={`row-employee-type-${type.id}`}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {type.description || "—"}
                    </TableCell>
                    <TableCell>
                      {type.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(type)}
                          data-testid={`button-edit-${type.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {type.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deactivateMutation.mutate(type.id)}
                            disabled={deactivateMutation.isPending}
                            data-testid={`button-deactivate-${type.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
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
              {searchQuery ? "No employee types found matching your search." : "No employee types created yet."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent data-testid="dialog-add-employee-type">
          <DialogHeader>
            <DialogTitle>Add Employee Type</DialogTitle>
            <DialogDescription>
              Create a new employee type category for workers.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAdd)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Trencher, Cable Layer"
                        {...field}
                        data-testid="input-employee-type-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the role and responsibilities..."
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        data-testid="input-employee-type-description"
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
        <DialogContent data-testid="dialog-edit-employee-type">
          <DialogHeader>
            <DialogTitle>Edit Employee Type</DialogTitle>
            <DialogDescription>
              Update the employee type details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Trencher, Cable Layer"
                        {...field}
                        data-testid="input-edit-employee-type-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the role and responsibilities..."
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-employee-type-description"
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
    </div>
  );
}
