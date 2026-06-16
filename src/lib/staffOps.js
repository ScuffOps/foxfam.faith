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

const streamRatingSchema = z.enum(["quiet", "good", "great", "legendary"]);
const taskStatusSchema = z.enum(["in_queue", "working_on", "blocked", "done"]);
const taskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

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

export function isOpenTask(task) {
  return task?.status !== "done";
}
