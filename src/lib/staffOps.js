import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  },
  z.string().optional(),
);

const requiredTrimmedString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1, "This field is required."),
);

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  },
  z.string().url("Use a valid URL.").optional(),
);

const optionalDateTime = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    return value.trim() || undefined;
  },
  z.string().optional(),
);

const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value == null) return undefined;
    return Number(value);
  },
  z.number().finite().nonnegative().optional(),
);

const streamRatingSchema = z.enum(["quiet", "good", "great", "legendary"]);
const taskStatusSchema = z.enum(["in_queue", "working_on", "blocked", "done"]);
const taskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
const shiftStatusSchema = z.enum(["scheduled", "confirmed", "covered", "missed"]);
const timeEntryStatusSchema = z.enum(["draft", "submitted", "approved", "paid"]);
const scuffoxUpdateStatusSchema = z.enum(["draft", "active", "archived"]);
const scuffoxUpdateToneSchema = z.enum(["announcement", "mood", "info", "stream", "quiet"]);

const streamLogSchema = z.object({
  title: requiredTrimmedString,
  stream_date: optionalDateTime,
  start_time: optionalDateTime,
  end_time: optionalDateTime,
  game: optionalTrimmedString,
  collaborators: optionalTrimmedString,
  vod_url: optionalUrl,
  notes: optionalTrimmedString,
  moments: optionalTrimmedString,
  rating: streamRatingSchema.default("good"),
});

const medicationSchema = z.object({
  brand_name: requiredTrimmedString,
  generic_name: optionalTrimmedString,
  strength: optionalTrimmedString,
  schedule: optionalTrimmedString,
  instructions: optionalTrimmedString,
  notes: optionalTrimmedString,
  active: z.boolean().default(true),
});

const medicationDoseSchema = z.object({
  medication_id: requiredTrimmedString,
  scheduled_time: optionalDateTime,
  taken_time: optionalDateTime,
  skipped: z.boolean().default(false),
  notes: optionalTrimmedString,
});

const staffTaskSchema = z.object({
  title: requiredTrimmedString,
  description: optionalTrimmedString,
  category: optionalTrimmedString,
  due_date: optionalDateTime,
  priority: taskPrioritySchema.default("normal"),
  status: taskStatusSchema.default("in_queue"),
  link_url: optionalUrl,
});

const modShiftSchema = z.object({
  staff_name: requiredTrimmedString,
  role: optionalTrimmedString,
  stream_title: optionalTrimmedString,
  starts_at: optionalDateTime,
  ends_at: optionalDateTime,
  duty_notes: optionalTrimmedString,
  status: shiftStatusSchema.default("scheduled"),
});

const staffTimeEntrySchema = z.object({
  staff_name: requiredTrimmedString,
  work_date: optionalDateTime,
  started_at: optionalDateTime,
  ended_at: optionalDateTime,
  break_minutes: optionalNumber.default(0),
  payable: z.boolean().default(true),
  status: timeEntryStatusSchema.default("draft"),
  notes: optionalTrimmedString,
});

const scuffoxUpdateSchema = z.object({
  title: requiredTrimmedString,
  message: requiredTrimmedString,
  tone: scuffoxUpdateToneSchema.default("announcement"),
  status: scuffoxUpdateStatusSchema.default("active"),
  starts_at: optionalDateTime,
  expires_at: optionalDateTime,
});

const botCommandSchema = z.object({
  command: requiredTrimmedString,
  action: optionalTrimmedString,
  type: optionalTrimmedString,
  user_requirement: optionalTrimmedString,
  cooldown: optionalTrimmedString,
  bot_used: optionalTrimmedString,
  alternate: optionalTrimmedString,
  source: z.enum(["manual", "mixitup", "streamelements", "streamlabs"]).default("manual"),
  external_id: optionalTrimmedString,
  enabled: z.boolean().default(true),
  notes: optionalTrimmedString,
});

export const TASK_STATUS_LABELS = {
  in_queue: "In Queue",
  working_on: "Working On",
  blocked: "Blocked",
  done: "Done",
};

export const TASK_PRIORITY_LABELS = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const STREAM_RATING_LABELS = {
  quiet: "Quiet",
  good: "Good",
  great: "Great",
  legendary: "Legendary",
};

export const SHIFT_STATUS_LABELS = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  covered: "Covered",
  missed: "Missed",
};

export const TIME_ENTRY_STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  paid: "Paid",
};

export const SCUFFOX_UPDATE_STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const SCUFFOX_UPDATE_TONE_LABELS = {
  announcement: "Announcement",
  mood: "Mood",
  info: "Info",
  stream: "Stream",
  quiet: "Quiet",
};

export const COMMAND_SOURCE_LABELS = {
  manual: "Manual",
  mixitup: "MixItUp",
  streamelements: "StreamElements",
  streamlabs: "Streamlabs",
};

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""),
  );
}

function parseDateTime(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function getValidationMessage(error) {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || "Please check the form and try again.";
  }
  return error?.message || "Something went wrong. Please try again.";
}

export function parseStreamLogForm(form) {
  const parsed = streamLogSchema.parse(form);
  return compactPayload({
    ...parsed,
    stream_date: parseDateTime(parsed.stream_date),
    start_time: parseDateTime(parsed.start_time),
    end_time: parseDateTime(parsed.end_time),
  });
}

export function parseMedicationForm(form) {
  return compactPayload(medicationSchema.parse(form));
}

export function parseMedicationDoseForm(form) {
  const parsed = medicationDoseSchema.parse(form);
  return compactPayload({
    ...parsed,
    scheduled_time: parseDateTime(parsed.scheduled_time),
    taken_time: parseDateTime(parsed.taken_time),
  });
}

export function parseStaffTaskForm(form) {
  const parsed = staffTaskSchema.parse(form);
  return compactPayload({
    ...parsed,
    due_date: parseDateTime(parsed.due_date),
  });
}

export function parseModShiftForm(form) {
  const parsed = modShiftSchema.parse(form);
  return compactPayload({
    ...parsed,
    starts_at: parseDateTime(parsed.starts_at),
    ends_at: parseDateTime(parsed.ends_at),
  });
}

export function parseStaffTimeEntryForm(form) {
  const parsed = staffTimeEntrySchema.parse(form);
  return compactPayload({
    ...parsed,
    work_date: parseDateTime(parsed.work_date),
    started_at: parseDateTime(parsed.started_at),
    ended_at: parseDateTime(parsed.ended_at),
  });
}

export function parseScuffoxUpdateForm(form) {
  const parsed = scuffoxUpdateSchema.parse(form);
  return compactPayload({
    ...parsed,
    starts_at: parseDateTime(parsed.starts_at),
    expires_at: parseDateTime(parsed.expires_at),
  });
}

export function parseBotCommandForm(form) {
  const parsed = botCommandSchema.parse(form);
  const command = parsed.command.startsWith("!") || parsed.command.startsWith("/")
    ? parsed.command
    : `!${parsed.command}`;
  return compactPayload({
    ...parsed,
    command,
  });
}

export function isOpenTask(task) {
  return task?.status !== "done";
}

export function getTimeEntryHours(entry) {
  if (!entry?.started_at || !entry?.ended_at) return 0;
  const start = new Date(entry.started_at);
  const end = new Date(entry.ended_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  const breakMinutes = Number(entry.break_minutes || 0);
  return Math.max(0, (end.getTime() - start.getTime()) / 36e5 - breakMinutes / 60);
}
