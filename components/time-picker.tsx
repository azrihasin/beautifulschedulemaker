// components/ui/time-picker.tsx
import { Input } from '@/components/ui/input'; // Import shadcn/ui Input
import { Clock } from 'lucide-react'; // Import Clock icon
import { useState } from 'react';

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [time, setTime] = useState(value);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    onChange(newTime);
  };

  return (
    <div className="relative w-full">
      <Input
        type="time"
        value={time}
        onChange={handleTimeChange}
        className="w-full pl-10" // Add padding for the icon
      />
      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
    </div>
  );
}