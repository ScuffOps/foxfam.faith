import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

function pad(value) {
  return String(value).padStart(2, "0");
}

function getLocalParts(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return { date: "", time: "" };

  const dateOnlyMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnlyMatch) return { date: dateOnlyMatch[1], time: "" };

  const localMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2})T?(\d{2}:\d{2})/);
  if (localMatch) return { date: localMatch[1], time: localMatch[2] };

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };

  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}

function getNowParts() {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function composeValue(date, time, { allowDateOnly, defaultTime }) {
  if (!date) return "";
  if (!time && allowDateOnly) return date;
  return `${date}T${time || defaultTime || "12:00"}`;
}

export default function DateTimeFields({
  allowDateOnly = false,
  className = "",
  dateAriaLabel = "Date",
  defaultTime = "12:00",
  disabled = false,
  onChangeValue,
  placeholder = "Optional time",
  timeAriaLabel = "Time",
  value,
}) {
  const { date, time } = getLocalParts(value);

  const updateDate = (nextDate) => {
    const nextTime = time || (!allowDateOnly ? getNowParts().time : "");
    onChangeValue?.(composeValue(nextDate, nextTime, { allowDateOnly, defaultTime }));
  };

  const updateTime = (nextTime) => {
    const nextDate = date || getNowParts().date;
    onChangeValue?.(composeValue(nextDate, nextTime, { allowDateOnly, defaultTime }));
  };

  const fillCurrent = () => {
    if (date) return;
    const now = getNowParts();
    onChangeValue?.(composeValue(now.date, now.time, { allowDateOnly: false, defaultTime }));
  };

  return (
    <div className={`grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.75rem] ${className}`}>
      <Input
        aria-label={dateAriaLabel}
        className="bg-secondary/60"
        disabled={disabled}
        onChange={(event) => updateDate(event.target.value)}
        onFocus={fillCurrent}
        type="date"
        value={date}
      />
      <div className="relative">
        <Clock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={timeAriaLabel}
          className="bg-secondary/60 pl-8"
          disabled={disabled}
          onChange={(event) => updateTime(event.target.value)}
          onFocus={fillCurrent}
          placeholder={placeholder}
          type="time"
          value={time}
        />
      </div>
    </div>
  );
}
