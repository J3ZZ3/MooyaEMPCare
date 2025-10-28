import SupervisorDashboard from '../SupervisorDashboard';

export default function SupervisorDashboardExample() {
  const labourers = [
    {
      id: '1',
      firstName: 'Thabo',
      surname: 'Mthembu',
      idNumber: '9012155678901',
      employeeType: 'Civil Worker - Trenching',
      contactNumber: '+27 82 345 6789',
      email: 'thabo.m@example.com'
    },
    {
      id: '2',
      firstName: 'Sipho',
      surname: 'Ndlovu',
      idNumber: '8506123456789',
      employeeType: 'Flagman',
      contactNumber: '+27 71 234 5678'
    },
    {
      id: '3',
      firstName: 'Mandla',
      surname: 'Khumalo',
      idNumber: '9305087654321',
      employeeType: 'Civil Worker - Trenching',
      contactNumber: '+27 83 456 7890',
      email: 'mandla.k@example.com'
    }
  ];

  const stats = {
    totalLabourers: 24,
    daysInPeriod: 10,
    periodEarnings: 45230
  };

  const handleAddLabourer = () => console.log('Add labourer');
  const handleEditLabourer = (id: string) => console.log('Edit labourer:', id);
  const handleRecordWork = () => console.log('Record work');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <SupervisorDashboard
        projectName="BPM 605"
        labourers={labourers}
        stats={stats}
        onAddLabourer={handleAddLabourer}
        onEditLabourer={handleEditLabourer}
        onRecordWork={handleRecordWork}
      />
    </div>
  );
}