import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DateRange } from "@/hooks/useAdminAnalytics";

interface Props {
  range: DateRange;
  onChange: (r: DateRange) => void;
  compare: boolean;
  onCompareChange: (v: boolean) => void;
}

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "365d", days: 365 },
];

export const DateRangeControl = ({ range, onChange, compare, onCompareChange }: Props) => {
  const [open, setOpen] = useState(false);

  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onChange({ from, to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {presets.map((p) => (
          <Button key={p.label} variant="outline" size="sm" onClick={() => applyPreset(p.days)}>
            {p.label}
          </Button>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", "min-w-[220px] justify-start font-normal")}>
            <CalendarIcon className="w-4 h-4" />
            {format(range.from, "dd MMM yyyy", { locale: es })} – {format(range.to, "dd MMM yyyy", { locale: es })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={(r) => {
              if (r?.from && r?.to) {
                onChange({ from: r.from, to: r.to });
              }
            }}
            numberOfMonths={2}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2 ml-2">
        <Switch id="compare" checked={compare} onCheckedChange={onCompareChange} />
        <Label htmlFor="compare" className="text-sm cursor-pointer">Comparar período previo</Label>
      </div>
    </div>
  );
};
