import ProjectManagerDashboard from '../ProjectManagerDashboard';

export default function ProjectManagerDashboardExample() {
  const projects = [
    {
      id: '1',
      name: 'BPM 605',
      location: 'Somerset East',
      budget: 250000,
      status: 'active' as const,
      labourerCount: 24,
      supervisorCount: 2
    },
    {
      id: '2',
      name: 'Fibre Deployment Phase 2',
      location: 'Port Elizabeth',
      budget: 180000,
      status: 'active' as const,
      labourerCount: 18,
      supervisorCount: 1
    },
    {
      id: '3',
      name: 'Network Extension',
      location: 'Grahamstown',
      status: 'on_hold' as const,
      labourerCount: 0,
      supervisorCount: 1
    }
  ];

  const paymentPeriods = [
    {
      id: '1',
      startDate: 'Dec 1',
      endDate: 'Dec 14',
      status: 'pending' as const,
      totalAmount: 45230,
      labourerCount: 24
    },
    {
      id: '2',
      startDate: 'Nov 15',
      endDate: 'Nov 28',
      status: 'approved' as const,
      totalAmount: 38750,
      labourerCount: 22
    }
  ];

  const stats = {
    totalProjects: 8,
    pendingApprovals: 2,
    totalBudget: 1250000,
    activeSupervisors: 5
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ProjectManagerDashboard
        projects={projects}
        paymentPeriods={paymentPeriods}
        stats={stats}
      />
    </div>
  );
}