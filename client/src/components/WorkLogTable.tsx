import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface WorkLogEntry {
  labourerId: string;
  labourerName: string;
  openMeters: number;
  closeMeters: number;
  openRate: number;
  closeRate: number;
}

interface WorkLogTableProps {
  entries: WorkLogEntry[];
  editable?: boolean;
  onUpdate?: (labourerId: string, field: 'openMeters' | 'closeMeters', value: number) => void;
}

export default function WorkLogTable({ entries, editable = false, onUpdate }: WorkLogTableProps) {
  const [localEntries, setLocalEntries] = useState(entries);

  const handleChange = (labourerId: string, field: 'openMeters' | 'closeMeters', value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalEntries(prev =>
      prev.map(entry =>
        entry.labourerId === labourerId ? { ...entry, [field]: numValue } : entry
      )
    );
    onUpdate?.(labourerId, field, numValue);
  };

  const calculateEarnings = (entry: WorkLogEntry) => {
    return (entry.openMeters * entry.openRate) + (entry.closeMeters * entry.closeRate);
  };

  return (
    <div className="border rounded-md" data-testid="table-work-log">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Labourer</TableHead>
            <TableHead className="text-right">Open Trenching (m)</TableHead>
            <TableHead className="text-right">Close Trenching (m)</TableHead>
            <TableHead className="text-right">Daily Earnings</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localEntries.map((entry) => (
            <TableRow key={entry.labourerId} data-testid={`row-labourer-${entry.labourerId}`}>
              <TableCell className="font-medium">{entry.labourerName}</TableCell>
              <TableCell className="text-right">
                {editable ? (
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={entry.openMeters}
                    onChange={(e) => handleChange(entry.labourerId, 'openMeters', e.target.value)}
                    className="w-24 text-right font-mono"
                    data-testid={`input-open-meters-${entry.labourerId}`}
                  />
                ) : (
                  <span className="font-mono">{entry.openMeters.toFixed(1)}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {editable ? (
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={entry.closeMeters}
                    onChange={(e) => handleChange(entry.labourerId, 'closeMeters', e.target.value)}
                    className="w-24 text-right font-mono"
                    data-testid={`input-close-meters-${entry.labourerId}`}
                  />
                ) : (
                  <span className="font-mono">{entry.closeMeters.toFixed(1)}</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                R {calculateEarnings(entry).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}