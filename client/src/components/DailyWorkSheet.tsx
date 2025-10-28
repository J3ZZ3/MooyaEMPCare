import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import WorkLogTable from "./WorkLogTable";

interface DailyWorkSheetProps {
  projectName: string;
  labourers: Array<{
    labourerId: string;
    labourerName: string;
    openMeters: number;
    closeMeters: number;
    openRate: number;
    closeRate: number;
  }>;
  onSave: (date: Date, entries: any[]) => void;
}

export default function DailyWorkSheet({ projectName, labourers, onSave }: DailyWorkSheetProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState(labourers);

  const handleUpdate = (labourerId: string, field: 'openMeters' | 'closeMeters', value: number) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.labourerId === labourerId ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleSave = () => {
    onSave(date, entries);
    console.log('Saved work sheet for', format(date, 'PPP'));
  };

  const totalDaily = entries.reduce((sum, entry) => 
    sum + (entry.openMeters * entry.openRate) + (entry.closeMeters * entry.closeRate), 0
  );

  return (
    <Card data-testid="card-daily-work-sheet">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <h2 className="text-xl font-semibold">{projectName}</h2>
          <p className="text-sm text-muted-foreground mt-1">Daily Work Entry</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-select-date">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="space-y-4">
        <WorkLogTable entries={entries} editable onUpdate={handleUpdate} />
        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Daily Earnings</p>
            <p className="text-2xl font-semibold font-mono">R {totalDaily.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleSave} data-testid="button-save-work-sheet">
          <Save className="mr-2 h-4 w-4" />
          Save Daily Sheet
        </Button>
      </CardFooter>
    </Card>
  );
}