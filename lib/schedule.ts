export type ScheduleMode = "manual" | "daily" | "weekdays" | "weekly" | "custom";

export const scheduleTimeOptions = [
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "18:00",
  "20:00",
  "21:00"
] as const;

export const weekdayOptions = [
  { value: "1", label: "周一" },
  { value: "2", label: "周二" },
  { value: "3", label: "周三" },
  { value: "4", label: "周四" },
  { value: "5", label: "周五" },
  { value: "6", label: "周六" },
  { value: "0", label: "周日" }
] as const;

type ParsedCron = {
  minute: number;
  hour: number;
  weekday: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseTime(time: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function parseCron(cron?: string | null): ParsedCron | null {
  if (!cron) {
    return null;
  }

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }

  const minute = Number(parts[0]);
  const hour = Number(parts[1]);
  const dayOfMonth = parts[2];
  const month = parts[3];
  const weekday = parts[4];

  if (!Number.isInteger(minute) || !Number.isInteger(hour)) {
    return null;
  }

  if (dayOfMonth !== "*" || month !== "*") {
    return null;
  }

  return {
    minute,
    hour,
    weekday
  };
}

function matchesWeekday(pattern: string, day: number) {
  if (pattern === "*") {
    return true;
  }

  if (pattern.includes("-")) {
    const [startRaw, endRaw] = pattern.split("-");
    const start = Number(startRaw);
    const end = Number(endRaw);
    return Number.isInteger(start) && Number.isInteger(end) ? day >= start && day <= end : false;
  }

  return Number(pattern) === day;
}

export function buildScheduleCron(input: {
  mode: ScheduleMode;
  time?: string | null;
  weekday?: string | null;
  customCron?: string | null;
}) {
  const mode = input.mode ?? "manual";

  if (mode === "manual") {
    return null;
  }

  if (mode === "custom") {
    return input.customCron?.trim() || null;
  }

  const parsedTime = parseTime(input.time ?? "09:00");
  if (!parsedTime) {
    return null;
  }

  const { hour, minute } = parsedTime;

  if (mode === "daily") {
    return `${minute} ${hour} * * *`;
  }

  if (mode === "weekdays") {
    return `${minute} ${hour} * * 1-5`;
  }

  if (mode === "weekly") {
    const weekday = input.weekday ?? "1";
    return `${minute} ${hour} * * ${weekday}`;
  }

  return null;
}

export function inferScheduleMode(cron?: string | null): {
  mode: ScheduleMode;
  time: string;
  weekday: string;
  customCron: string;
} {
  const parsed = parseCron(cron);

  if (!parsed) {
    return {
      mode: cron ? "custom" : "manual",
      time: "09:00",
      weekday: "1",
      customCron: cron ?? ""
    };
  }

  const time = `${pad(parsed.hour)}:${pad(parsed.minute)}`;

  if (parsed.weekday === "*") {
    return {
      mode: "daily",
      time,
      weekday: "1",
      customCron: cron ?? ""
    };
  }

  if (parsed.weekday === "1-5") {
    return {
      mode: "weekdays",
      time,
      weekday: "1",
      customCron: cron ?? ""
    };
  }

  if (/^[0-6]$/.test(parsed.weekday)) {
    return {
      mode: "weekly",
      time,
      weekday: parsed.weekday,
      customCron: cron ?? ""
    };
  }

  return {
    mode: "custom",
    time,
    weekday: "1",
    customCron: cron ?? ""
  };
}

export function getNextRunAtForCron(cron?: string | null, from = new Date()) {
  const parsed = parseCron(cron);
  if (!parsed) {
    return null;
  }

  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);

  for (let index = 0; index < 14 * 24 * 60; index += 1) {
    cursor.setMinutes(cursor.getMinutes() + 1);

    if (cursor.getHours() !== parsed.hour || cursor.getMinutes() !== parsed.minute) {
      continue;
    }

    if (matchesWeekday(parsed.weekday, cursor.getDay())) {
      return new Date(cursor);
    }
  }

  return null;
}
