import ProjectCard from '../ProjectCard';

export default function ProjectCardExample() {
  const handleView = (id: string) => console.log('View project:', id);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      <ProjectCard
        id="1"
        name="BPM 605"
        location="Somerset East"
        budget={250000}
        status="active"
        labourerCount={24}
        supervisorCount={2}
        onView={handleView}
      />
      <ProjectCard
        id="2"
        name="Fibre Deployment Phase 2"
        location="Port Elizabeth"
        budget={180000}
        status="active"
        labourerCount={18}
        supervisorCount={1}
        onView={handleView}
      />
      <ProjectCard
        id="3"
        name="Network Extension"
        location="Grahamstown"
        status="on_hold"
        labourerCount={0}
        supervisorCount={1}
        onView={handleView}
      />
    </div>
  );
}