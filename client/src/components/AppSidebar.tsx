import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Briefcase, Users, DollarSign, FileText, Settings, LogOut } from "lucide-react";
import RoleBadge from "./RoleBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import mooyaLogo from "@assets/Mooya Logo_1761683789909.png";

type UserRole = "super_admin" | "admin" | "project_manager" | "supervisor" | "project_admin" | "labourer";

interface AppSidebarProps {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  currentPath?: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const menuItems = {
  super_admin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { title: "Projects", icon: Briefcase, path: "/projects" },
    { title: "Users", icon: Users, path: "/users" },
    { title: "Employee Types", icon: FileText, path: "/employee-types" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  admin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { title: "Projects", icon: Briefcase, path: "/projects" },
    { title: "Users", icon: Users, path: "/users" },
    { title: "Employee Types", icon: FileText, path: "/employee-types" },
  ],
  project_manager: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { title: "Projects", icon: Briefcase, path: "/projects" },
    { title: "Payments", icon: DollarSign, path: "/payments" },
    { title: "Audit Trail", icon: FileText, path: "/audit" },
  ],
  supervisor: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { title: "Labourers", icon: Users, path: "/labourers" },
    { title: "Daily Work", icon: FileText, path: "/work-log" },
  ],
  project_admin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { title: "Projects", icon: Briefcase, path: "/projects" },
    { title: "Audit Trail", icon: FileText, path: "/audit" },
  ],
  labourer: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { title: "Work History", icon: FileText, path: "/work-history" },
  ],
};

export default function AppSidebar({
  userRole,
  userName,
  userEmail,
  currentPath = "/dashboard",
  onNavigate,
  onLogout
}: AppSidebarProps) {
  const items = menuItems[userRole];
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={mooyaLogo} alt="Mooya Wireless" className="w-10 h-10" />
          <div>
            <h2 className="font-semibold">Mooya EMPCare</h2>
            <p className="text-xs text-muted-foreground">Fibre Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => onNavigate(item.path)}
                    isActive={currentPath === item.path}
                    data-testid={`nav-${item.path.slice(1)}`}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <RoleBadge role={userRole} />
        <SidebarMenuButton onClick={onLogout} data-testid="button-logout">
          <LogOut />
          <span>Logout</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}