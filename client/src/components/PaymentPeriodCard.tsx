import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { Calendar, Users, DollarSign } from "lucide-react";

interface PaymentPeriodCardProps {
  id: string;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "paid";
  totalAmount: number;
  labourerCount: number;
  onView: (id: string) => void;
  onApprove?: (id: string) => void;
}

export default function PaymentPeriodCard({
  id,
  startDate,
  endDate,
  status,
  totalAmount,
  labourerCount,
  onView,
  onApprove
}: PaymentPeriodCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-payment-period-${id}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2" />
          {startDate} - {endDate}
        </div>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-semibold font-mono">R {totalAmount.toLocaleString()}</p>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="w-4 h-4 mr-2" />
          {labourerCount} labourers
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => onView(id)}
          data-testid={`button-view-period-${id}`}
        >
          View Details
        </Button>
        {status === "pending" && onApprove && (
          <Button 
            className="flex-1"
            onClick={() => onApprove(id)}
            data-testid={`button-approve-period-${id}`}
          >
            Approve
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}