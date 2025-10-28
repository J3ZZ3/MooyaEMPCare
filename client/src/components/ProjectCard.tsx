import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { MapPin, DollarSign, Users } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  location?: string;
  budget?: number;
  status: "active" | "completed" | "on_hold";
  labourerCount: number;
  supervisorCount: number;
  onView: (id: string) => void;
}

export default function ProjectCard({
  id,
  name,
  location,
  budget,
  status,
  labourerCount,
  supervisorCount,
  onView
}: ProjectCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-project-${id}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-semibold">{name}</h3>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-3">
        {location && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2" />
            {location}
          </div>
        )}
        {budget && (
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4 mr-2" />
            R {budget.toLocaleString()}
          </div>
        )}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Users className="w-4 h-4 mr-1" />
            {labourerCount} labourers
          </div>
          <div className="text-muted-foreground">
            {supervisorCount} supervisors
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => onView(id)}
          data-testid={`button-view-project-${id}`}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}