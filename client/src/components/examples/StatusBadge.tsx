import StatusBadge from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-3 p-6">
      <StatusBadge status="active" />
      <StatusBadge status="pending" />
      <StatusBadge status="approved" />
      <StatusBadge status="rejected" />
      <StatusBadge status="paid" />
      <StatusBadge status="completed" />
      <StatusBadge status="on_hold" />
    </div>
  );
}