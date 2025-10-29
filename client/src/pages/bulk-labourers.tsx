import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, EmployeeType, User } from "@shared/schema";

interface BulkLabourersProps {
  user: User;
}

interface LabourerRow {
  firstName: string;
  surname: string;
  idNumber: string;
  dateOfBirth: string;
  contactNumber: string;
  employeeTypeId: string;
  email: string;
  gender: string;
  physicalAddress: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  branchCode: string;
}

export default function BulkLabourers({ user }: BulkLabourersProps) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [labourers, setLabourers] = useState<LabourerRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvText, setCsvText] = useState("");

  const { data: projects = [], isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: employeeTypes = [], isLoading: loadingTypes } = useQuery<EmployeeType[]>({
    queryKey: ["/api/employee-types"],
  });

  const activeProjects = projects.filter((p) => p.status === "active");

  const addEmptyRow = () => {
    setLabourers([
      ...labourers,
      {
        firstName: "",
        surname: "",
        idNumber: "",
        dateOfBirth: "",
        contactNumber: "",
        employeeTypeId: "",
        email: "",
        gender: "",
        physicalAddress: "",
        bankName: "",
        accountNumber: "",
        accountType: "savings",
        branchCode: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    setLabourers(labourers.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof LabourerRow, value: string) => {
    const updated = [...labourers];
    updated[index][field] = value;
    setLabourers(updated);
  };

  const parseCsv = () => {
    if (!csvText.trim()) {
      toast({
        title: "No data",
        description: "Please paste CSV data first",
        variant: "destructive",
      });
      return;
    }

    const lines = csvText.trim().split("\n");
    const parsed: LabourerRow[] = [];

    lines.forEach((line, idx) => {
      if (idx === 0) return; // Skip header row
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      
      if (parts.length >= 11) {
        parsed.push({
          firstName: parts[0] || "",
          surname: parts[1] || "",
          idNumber: parts[2] || "",
          dateOfBirth: parts[3] || "",
          contactNumber: parts[4] || "",
          employeeTypeId: parts[5] || "",
          email: parts[6] || "",
          gender: parts[7] || "",
          physicalAddress: parts[8] || "",
          bankName: parts[9] || "",
          accountNumber: parts[10] || "",
          accountType: parts[11] || "savings",
          branchCode: parts[12] || "",
        });
      }
    });

    if (parsed.length === 0) {
      toast({
        title: "No valid rows",
        description: "Could not parse any valid labourer rows from CSV",
        variant: "destructive",
      });
      return;
    }

    setLabourers(parsed);
    setCsvText("");
    toast({
      title: "CSV Parsed",
      description: `Loaded ${parsed.length} labourers from CSV`,
    });
  };

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      toast({
        title: "Select a project",
        description: "Please select a project before submitting",
        variant: "destructive",
      });
      return;
    }

    if (labourers.length === 0) {
      toast({
        title: "No labourers",
        description: "Please add at least one labourer",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    for (let i = 0; i < labourers.length; i++) {
      const l = labourers[i];
      if (!l.firstName || !l.surname || !l.idNumber || !l.dateOfBirth || !l.contactNumber || !l.employeeTypeId || !l.bankName || !l.accountNumber || !l.branchCode) {
        toast({
          title: "Missing required fields",
          description: `Row ${i + 1} is missing required fields`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const labourersData = labourers.map((l) => ({
        ...l,
        projectId: selectedProjectId,
      }));

      await apiRequest("POST", "/api/labourers/bulk", { labourers: labourersData });

      const count = labourers.length;
      const projectId = selectedProjectId;
      
      // Clear form first
      setLabourers([]);
      setSelectedProjectId("");

      toast({
        title: "Success",
        description: `Successfully created ${count} labourers`,
      });
      
      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/labourers`] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create labourers",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProjects || loadingTypes) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-bulk-labourers">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="heading-bulk-labourers">Bulk Labourer Entry</h1>
        <p className="text-muted-foreground">Add multiple labourers to a project at once</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Selection</CardTitle>
            <CardDescription>Select the project to add labourers to</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="project-select">Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project-select" data-testid="select-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSV Import</CardTitle>
            <CardDescription>
              Paste CSV data with columns: First Name, Surname, ID Number, Date of Birth (YYYY-MM-DD), Contact Number, Employee Type ID, Email, Gender, Address, Bank Name, Account Number, Account Type, Branch Code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your CSV data here..."
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              data-testid="textarea-csv"
            />
            <Button onClick={parseCsv} variant="outline" data-testid="button-parse-csv">
              <Upload className="w-4 h-4 mr-2" />
              Parse CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Labourers ({labourers.length})</CardTitle>
              <CardDescription>Enter labourer details or use CSV import above</CardDescription>
            </div>
            <Button onClick={addEmptyRow} size="sm" data-testid="button-add-row">
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {labourers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No labourers added yet. Click "Add Row" or use CSV import.
                </p>
              )}
              {labourers.map((labourer, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3" data-testid={`labourer-row-${index}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Labourer {index + 1}</h3>
                    <Button onClick={() => removeRow(index)} variant="ghost" size="sm" data-testid={`button-remove-${index}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <Label>First Name *</Label>
                      <Input
                        value={labourer.firstName}
                        onChange={(e) => updateRow(index, "firstName", e.target.value)}
                        placeholder="John"
                        data-testid={`input-firstName-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Surname *</Label>
                      <Input
                        value={labourer.surname}
                        onChange={(e) => updateRow(index, "surname", e.target.value)}
                        placeholder="Doe"
                        data-testid={`input-surname-${index}`}
                      />
                    </div>
                    <div>
                      <Label>ID Number *</Label>
                      <Input
                        value={labourer.idNumber}
                        onChange={(e) => updateRow(index, "idNumber", e.target.value)}
                        placeholder="9001015000000"
                        data-testid={`input-idNumber-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Date of Birth *</Label>
                      <Input
                        type="date"
                        value={labourer.dateOfBirth}
                        onChange={(e) => updateRow(index, "dateOfBirth", e.target.value)}
                        data-testid={`input-dateOfBirth-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Contact Number *</Label>
                      <Input
                        value={labourer.contactNumber}
                        onChange={(e) => updateRow(index, "contactNumber", e.target.value)}
                        placeholder="0123456789"
                        data-testid={`input-contactNumber-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Employee Type *</Label>
                      <Select
                        value={labourer.employeeTypeId}
                        onValueChange={(value) => updateRow(index, "employeeTypeId", value)}
                      >
                        <SelectTrigger data-testid={`select-employeeType-${index}`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {employeeTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={labourer.email}
                        onChange={(e) => updateRow(index, "email", e.target.value)}
                        placeholder="john@example.com"
                        data-testid={`input-email-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select
                        value={labourer.gender}
                        onValueChange={(value) => updateRow(index, "gender", value)}
                      >
                        <SelectTrigger data-testid={`select-gender-${index}`}>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Physical Address</Label>
                      <Input
                        value={labourer.physicalAddress}
                        onChange={(e) => updateRow(index, "physicalAddress", e.target.value)}
                        placeholder="123 Main St"
                        data-testid={`input-physicalAddress-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Bank Name *</Label>
                      <Input
                        value={labourer.bankName}
                        onChange={(e) => updateRow(index, "bankName", e.target.value)}
                        placeholder="FNB"
                        data-testid={`input-bankName-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Account Number *</Label>
                      <Input
                        value={labourer.accountNumber}
                        onChange={(e) => updateRow(index, "accountNumber", e.target.value)}
                        placeholder="1234567890"
                        data-testid={`input-accountNumber-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Account Type *</Label>
                      <Select
                        value={labourer.accountType}
                        onValueChange={(value) => updateRow(index, "accountType", value)}
                      >
                        <SelectTrigger data-testid={`select-accountType-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="current">Current</SelectItem>
                          <SelectItem value="transmission">Transmission</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Branch Code *</Label>
                      <Input
                        value={labourer.branchCode}
                        onChange={(e) => updateRow(index, "branchCode", e.target.value)}
                        placeholder="250655"
                        data-testid={`input-branchCode-${index}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedProjectId || labourers.length === 0}
            data-testid="button-submit-bulk"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create {labourers.length} Labourer{labourers.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
