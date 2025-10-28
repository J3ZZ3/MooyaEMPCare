import DailyWorkSheet from '../DailyWorkSheet';

export default function DailyWorkSheetExample() {
  const labourers = [
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

  const handleSave = (date: Date, entries: any[]) => {
    console.log('Saved work sheet:', date, entries);
  };

  return (
    <div className="p-6 max-w-4xl">
      <DailyWorkSheet
        projectName="BPM 605"
        labourers={labourers}
        onSave={handleSave}
      />
    </div>
  );
}