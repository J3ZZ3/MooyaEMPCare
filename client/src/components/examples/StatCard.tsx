import StatCard from '../StatCard';
import { Users, Briefcase, DollarSign, Calendar } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      <StatCard title="Total Labourers" value="127" icon={Users} />
      <StatCard title="Active Projects" value="8" icon={Briefcase} />
      <StatCard title="Current Period Earnings" value="R 45,230" icon={DollarSign} subtitle="14 days" />
      <StatCard title="Next Payment" value="3 days" icon={Calendar} subtitle="Dec 15, 2025" />
    </div>
  );
}