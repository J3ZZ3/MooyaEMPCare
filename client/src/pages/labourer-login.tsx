import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function LabourerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response: any = await apiRequest("POST", "/api/labourer/login", {
        identifier: identifier.trim(),
        password: password.trim(),
      });

      if (response.success) {
        toast({
          title: "Login successful",
          description: `Welcome back, ${response.labourer.firstName}!`,
        });
        setLocation("/labourer-dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid phone/email or RSA ID/passport number",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Labourer Login</CardTitle>
          <CardDescription className="text-center">
            Enter your phone number or email and RSA ID/passport number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Phone Number or Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="0821234567 or email@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10"
                  data-testid="input-identifier"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use your registered phone number or email address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">RSA ID or Passport Number</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your ID or passport number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10"
                  data-testid="input-password"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your RSA ID (13 digits) or passport number
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-4">
              <p>Need help accessing your account?</p>
              <p className="mt-1">Contact your supervisor or project manager</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
