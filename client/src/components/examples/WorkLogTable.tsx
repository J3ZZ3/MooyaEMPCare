import WorkLogTable from '../WorkLogTable';

export default function WorkLogTableExample() {
  const entries = [
    {
      labourerId: '1',
      labourerName: 'Thabo Mthembu',
      openMeters: 15.5,
      closeMeters: 12.0,
      openRate: 25,
      closeRate: 20
    },
    {
      labourerId: '2',
      labourerName: 'Sipho Ndlovu',
      openMeters: 18.0,
      closeMeters: 15.5,
      openRate: 25,
      closeRate: 20
    },
    {
      labourerId: '3',
      labourerName: 'Mandla Khumalo',
      openMeters: 14.0,
      closeMeters: 11.0,
      openRate: 25,
      closeRate: 20
    }
  ];

  const handleUpdate = (labourerId: string, field: string, value: number) => {
    console.log('Updated:', labourerId, field, value);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Editable Work Log</h3>
        <WorkLogTable entries={entries} editable onUpdate={handleUpdate} />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Read-Only Work Log</h3>
        <WorkLogTable entries={entries} />
      </div>
    </div>
  );
}