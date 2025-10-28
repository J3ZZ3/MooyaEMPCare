import LabourerDashboard from '../LabourerDashboard';

export default function LabourerDashboardExample() {
  const workHistory = [
    { date: 'Dec 10, 2025', openMeters: 15.5, closeMeters: 12.0, earnings: 627.50, status: 'pending' as const },
    { date: 'Dec 9, 2025', openMeters: 18.0, closeMeters: 15.5, earnings: 760.00, status: 'pending' as const },
    { date: 'Dec 8, 2025', openMeters: 14.0, closeMeters: 11.0, earnings: 570.00, status: 'pending' as const },
    { date: 'Dec 5, 2025', openMeters: 16.5, closeMeters: 13.5, earnings: 682.50, status: 'approved' as const },
    { date: 'Dec 4, 2025', openMeters: 17.0, closeMeters: 14.0, earnings: 705.00, status: 'approved' as const },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <LabourerDashboard
        labourerName="Thabo Mthembu"
        currentPeriodEarnings={3345.00}
        daysWorked={5}
        nextPaymentDate="Dec 15"
        totalMeters={147.0}
        workHistory={workHistory}
      />
    </div>
  );
}