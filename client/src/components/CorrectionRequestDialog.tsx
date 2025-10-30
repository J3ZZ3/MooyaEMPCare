import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import type { User } from "@shared/schema";

// Field definitions for each entity type
const ENTITY_FIELDS: Record<string, { label: string; value: string }[]> = {
  work_log: [
    { label: "Open Trenching Meters", value: "openTrenchingMeters" },
    { label: "Close Trenching Meters", value: "closeTrenchingMeters" },
    { label: "Work Date", value: "workDate" },
  ],
  labourer: [
    { label: "First Name", value: "firstName" },
    { label: "Surname", value: "surname" },
    { label: "Contact Number", value: "contactNumber" },
    { label: "Email", value: "email" },
    { label: "Physical Address", value: "physicalAddress" },
    { label: "Bank Name", value: "bankName" },
    { label: "Account Number", value: "accountNumber" },
    { label: "Branch Code", value: "branchCode" },
  ],
  project: [
    { label: "Project Name", value: "name" },
    { label: "Location", value: "location" },
    { label: "Budget", value: "budget" },
  ],
  payment_period: [
    { label: "Start Date", value: "startDate" },
    { label: "End Date", value: "endDate" },
    { label: "Status", value: "status" },
  ],
};

const correctionRequestFormSchema = z.object({
  fieldName: z.string().min(1, "Please select a field"),
  oldValue: z.string(),
  newValue: z.string().min(1, "Please enter the new value"),
  reason: z.string().min(10, "Please provide a detailed reason (at least 10 characters)"),
});

type CorrectionRequestFormData = z.infer<typeof correctionRequestFormSchema>;

interface CorrectionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "work_log" | "labourer" | "project" | "payment_period";
  entityId: string;
  entityData: Record<string, any>;
  user: User;
  entityDisplayName?: string;
}

export default function CorrectionRequestDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityData,
  user,
  entityDisplayName,
}: CorrectionRequestDialogProps) {
  const { toast } = useToast();
  const [selectedField, setSelectedField] = useState<string>("");

  const form = useForm<CorrectionRequestFormData>({
    resolver: zodResolver(correctionRequestFormSchema),
    defaultValues: {
      fieldName: "",
      oldValue: "",
      newValue: "",
      reason: "",
    },
  });

  // Get the current value when field is selected
  const handleFieldChange = (fieldName: string) => {
    setSelectedField(fieldName);
    const currentValue = entityData[fieldName];
    const displayValue = currentValue !== null && currentValue !== undefined 
      ? String(currentValue) 
      : "";
    form.setValue("fieldName", fieldName);
    form.setValue("oldValue", displayValue);
    form.setValue("newValue", "");
  };

  const createMutation = useMutation({
    mutationFn: async (data: CorrectionRequestFormData) => {
      return apiRequest("POST", "/api/correction-requests", {
        entityType,
        entityId,
        fieldName: data.fieldName,
        oldValue: data.oldValue,
        newValue: data.newValue,
        reason: data.reason,
        requestedBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/correction-requests"] });
      toast({
        title: "Correction request submitted",
        description: "Your request will be reviewed by an administrator",
      });
      form.reset();
      setSelectedField("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit correction request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CorrectionRequestFormData) => {
    createMutation.mutate(data);
  };

  const availableFields = ENTITY_FIELDS[entityType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-request-correction">
        <DialogHeader>
          <DialogTitle>Request Data Correction</DialogTitle>
          <DialogDescription>
            {entityDisplayName 
              ? `Submit a request to correct data for ${entityDisplayName}`
              : "Submit a request to correct this data"}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted p-3 mb-4">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Historical data cannot be edited directly. Your correction request will be reviewed and approved by an administrator.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fieldName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field to Correct</FormLabel>
                  <Select 
                    onValueChange={handleFieldChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-correction-field">
                        <SelectValue placeholder="Select the field to correct" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableFields.map((fieldOption) => (
                        <SelectItem key={fieldOption.value} value={fieldOption.value}>
                          {fieldOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedField && (
              <>
                <FormField
                  control={form.control}
                  name="oldValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          disabled 
                          className="bg-muted"
                          data-testid="input-correction-old-value"
                        />
                      </FormControl>
                      <FormDescription>This is the current value in the system</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Value</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter the correct value"
                          data-testid="input-correction-new-value"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Correction</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Explain why this correction is needed"
                          rows={3}
                          data-testid="input-correction-reason"
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a clear explanation to help reviewers approve your request
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  form.reset();
                  setSelectedField("");
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !selectedField}
                data-testid="button-submit-correction"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
