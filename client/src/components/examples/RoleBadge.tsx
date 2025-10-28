import RoleBadge from '../RoleBadge';

export default function RoleBadgeExample() {
  return (
    <div className="flex flex-wrap gap-3 p-6">
      <RoleBadge role="super_admin" />
      <RoleBadge role="admin" />
      <RoleBadge role="project_manager" />
      <RoleBadge role="supervisor" />
      <RoleBadge role="project_admin" />
      <RoleBadge role="labourer" />
    </div>
  );
}