import LabourerCard from '../LabourerCard';

export default function LabourerCardExample() {
  const handleEdit = (id: string) => console.log('Edit labourer:', id);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 max-w-4xl">
      <LabourerCard
        id="1"
        firstName="Thabo"
        surname="Mthembu"
        idNumber="9012155678901"
        employeeType="Civil Worker - Trenching"
        contactNumber="+27 82 345 6789"
        email="thabo.m@example.com"
        onEdit={handleEdit}
      />
      <LabourerCard
        id="2"
        firstName="Sipho"
        surname="Ndlovu"
        idNumber="8506123456789"
        employeeType="Flagman"
        contactNumber="+27 71 234 5678"
        onEdit={handleEdit}
      />
    </div>
  );
}