import PaymentPeriodCard from '../PaymentPeriodCard';

export default function PaymentPeriodCardExample() {
  const handleView = (id: string) => console.log('View period:', id);
  const handleApprove = (id: string) => console.log('Approve period:', id);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      <PaymentPeriodCard
        id="1"
        startDate="Dec 1"
        endDate="Dec 14"
        status="pending"
        totalAmount={45230}
        labourerCount={24}
        onView={handleView}
        onApprove={handleApprove}
      />
      <PaymentPeriodCard
        id="2"
        startDate="Nov 15"
        endDate="Nov 28"
        status="approved"
        totalAmount={38750}
        labourerCount={22}
        onView={handleView}
      />
      <PaymentPeriodCard
        id="3"
        startDate="Nov 1"
        endDate="Nov 14"
        status="paid"
        totalAmount={41200}
        labourerCount={23}
        onView={handleView}
      />
    </div>
  );
}