import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Pencil } from "lucide-react";

interface LabourerCardProps {
  id: string;
  firstName: string;
  surname: string;
  idNumber: string;
  employeeType: string;
  contactNumber: string;
  email?: string;
  profilePhoto?: string;
  onEdit: (id: string) => void;
}

export default function LabourerCard({
  id,
  firstName,
  surname,
  idNumber,
  employeeType,
  contactNumber,
  email,
  profilePhoto,
  onEdit
}: LabourerCardProps) {
  const initials = `${firstName[0]}${surname[0]}`.toUpperCase();
  
  return (
    <Card className="hover-elevate" data-testid={`card-labourer-${id}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profilePhoto} alt={`${firstName} ${surname}`} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-lg">{firstName} {surname}</h3>
                <p className="text-sm text-muted-foreground font-mono">{idNumber}</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => onEdit(id)}
                data-testid={`button-edit-labourer-${id}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
            <Badge variant="secondary" className="mb-3">{employeeType}</Badge>
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5 mr-2" />
                {contactNumber}
              </div>
              {email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 mr-2" />
                  {email}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}