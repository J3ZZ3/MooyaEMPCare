import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from '../AppSidebar';
import { useState } from 'react';

export default function AppSidebarExample() {
  const [currentPath, setCurrentPath] = useState('/dashboard');

  const handleNavigate = (path: string) => {
    console.log('Navigate to:', path);
    setCurrentPath(path);
  };

  const handleLogout = () => console.log('Logout');

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userRole="project_manager"
          userName="John Doe"
          userEmail="john.doe@mooya.co.za"
          currentPath={currentPath}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold mb-2">Sidebar Navigation Example</h1>
            <p className="text-muted-foreground mb-4">
              Click on the navigation items to see the active state change.
            </p>
            <div className="p-6 border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground">Current path:</p>
              <p className="text-lg font-mono font-semibold">{currentPath}</p>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}