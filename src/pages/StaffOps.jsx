import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Activity,
  BookOpen,
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  ClipboardList,
  ExternalLink,
  Keyboard,
  Pill,
  Play,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  Square,
  Trash2,
  UserCog,
} from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import GlassCard from "../components/GlassCard";
import { canModerate } from "@/lib/roles";
import { DEFAULT_COMMAND_REFERENCE, STAFF_HANDBOOK_SECTIONS } from "@/lib/staffHandbook";
import { getPublicDisplayName } from "@/lib/userIdentity";
import {
  COMMAND_SOURCE_LABELS,
  SCUFFOX_UPDATE_STATUS_LABELS,
  SCUFFOX_UPDATE_TONE_LABELS,
  SHIFT_STATUS_LABELS,
  STREAM_RATING_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TIME_ENTRY_STATUS_LABELS,
  formatTimerDuration,
  getTimeEntryHours,
  getTimeRangeHours,
  getValidationMessage,
  isOpenTask,
  parseBotCommandForm,
  parseMedicationDoseForm,
  parseMedicationForm,
  parseModShiftForm,
  parseScuffoxUpdateForm,
  parseShiftPlannerAssignmentForm,
  parseStaffAvailabilityForm,
  parseStaffTaskForm,
  parseStaffTimeEntryForm,
  parseStreamLogForm,
} from "@/lib/staffOps";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: Activity },
  { key: "handbook", label: "Handbook", icon: BookOpen },
  { key: "updates", label: "Updates", icon: Bell },
  { key: "commands", label: "Commands", icon: Bot },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
  { key: "time", label: "Time Tracker", icon: Clock },
  { key: "streams", label: "Stream Logs", icon: Radio },
  { key: "meds", label: "Medication", icon: Pill },
  { key: "tasks", label: "Tasklist", icon: ClipboardList },
  { key: "members", label: "Team", icon: UserCog },
];

const STAFF_HANDY_LINKS = [
  { label: "Stream Rules", description: "Rule snapshot for live chat decisions.", to: "/ops/handbook", icon: ShieldAlert },
  { label: "Mod Manual", description: "Onboarding, escalation, and Veri reminders.", to: "/ops/handbook", icon: BookOpen },
  { label: "Command List", description: "Manual command ref, MixItUp-ready later.", to: "/ops/commands", icon: Bot },
  { label: "Google Drive", description: "Docs, Sheets, and shared staff references.", href: "https://drive.google.com/drive/my-drive", icon: ExternalLink },
  { label: "Discord", description: "Mod channels, stream threads, and handoff notes.", href: "https://discord.com/channels/@me", icon: Bell },
  { label: "Veri Lore", description: "Codex context for the blessed nonsense.", to: "/codex", icon: BookOpen },
];

const STAFF_MODULE_SHORTCUTS = [
  { label: "Team", description: "Display names and staff roster sanity checks.", tab: "members", icon: UserCog },
  { label: "Availability", description: "Who can be summoned when stream time becomes a rumor.", tab: "schedule", icon: CalendarClock },
  { label: "Schedule", description: "Coverage, shifts, and on-duty handoffs.", tab: "schedule", icon: CalendarClock },
  { label: "Handbook", description: "Rules, reminders, escalation, and mod onboarding.", tab: "handbook", icon: BookOpen },
  { label: "Shift Planner", description: "Assign coverage blocks and keep the room watched.", tab: "schedule", icon: ClipboardList },
  { label: "Time Tracker", description: "Paid staff hours without spreadsheet archaeology.", tab: "time", icon: Clock },
];

const STAFF_ROLE_VALUES = new Set(["admin", "lead_mod", "mod"]);

const STAFF_DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const STAFF_HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));

const AVAILABILITY_STATUSES = [
  { key: "free", label: "Free", className: "bg-emerald-500 text-white border-emerald-300/70" },
  { key: "on_call", label: "On Call", className: "bg-sky-500 text-white border-sky-300/70" },
  { key: "busy", label: "Busy", className: "bg-amber-400 text-black border-amber-200/80" },
  { key: "dnd", label: "Do Not Disturb", className: "bg-rose-500 text-white border-rose-300/70" },
];

const AVAILABILITY_STATUS_MAP = Object.fromEntries(AVAILABILITY_STATUSES.map((status) => [status.key, status]));

const SHIFT_PLANNER_BLOCKS = [
  { key: "morning", label: "Morning", time: "6am - 12pm", hours: ["06", "07", "08", "09", "10", "11"] },
  { key: "day", label: "Day", time: "12pm - 6pm", hours: ["12", "13", "14", "15", "16", "17"] },
  { key: "night", label: "Night", time: "6pm - 12am", hours: ["18", "19", "20", "21", "22", "23"] },
];

const DEFAULT_STREAM_FORM = {
  title: "",
  stream_date: "",
  start_time: "",
  end_time: "",
  game: "",
  collaborators: "",
  vod_url: "",
  notes: "",
  moments: "",
  rating: "good",
};

const DEFAULT_MED_FORM = {
  brand_name: "",
  generic_name: "",
  strength: "",
  schedule: "",
  instructions: "",
  notes: "",
  active: true,
};

const DEFAULT_DOSE_FORM = {
  medication_id: "",
  scheduled_time: "",
  taken_time: "",
  skipped: false,
  notes: "",
};

const DEFAULT_TASK_FORM = {
  title: "",
  description: "",
  category: "",
  due_date: "",
  priority: "normal",
  status: "in_queue",
  link_url: "",
};

const DEFAULT_SHIFT_FORM = {
  staff_name: "",
  role: "Chat Mod",
  stream_title: "",
  starts_at: "",
  ends_at: "",
  duty_notes: "",
  status: "scheduled",
};

const DEFAULT_TIME_FORM = {
  staff_name: "",
  work_date: "",
  started_at: "",
  ended_at: "",
  break_minutes: 0,
  payable: true,
  status: "draft",
  notes: "",
};

const TIMER_STORAGE_PREFIX = "foxfam.staffTime.activeTimer.v1";
const TIMER_SHORTCUT_STORAGE_KEY = "foxfam.staffTime.shortcutEnabled.v1";

const DEFAULT_UPDATE_FORM = {
  title: "",
  message: "",
  tone: "announcement",
  status: "active",
  starts_at: "",
  expires_at: "",
};

const DEFAULT_COMMAND_FORM = {
  command: "",
  action: "",
  type: "",
  user_requirement: "",
  cooldown: "",
  bot_used: "MixItUp",
  alternate: "",
  source: "manual",
  external_id: "",
  enabled: true,
  notes: "",
};

const DEFAULT_MEMBER_FORM = {
  profile_id: "",
  display_name: "",
};

function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDateTimeInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function readStoredTimer(key) {
  if (typeof window === "undefined" || !key) return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    if (!parsed?.started_at || Number.isNaN(new Date(parsed.started_at).getTime())) return null;
    return {
      staff_name: parsed.staff_name || "",
      started_at: parsed.started_at,
      break_minutes: Number(parsed.break_minutes || 0),
      notes: parsed.notes || "",
      payable: parsed.payable !== false,
    };
  } catch {
    return null;
  }
}

function writeStoredTimer(key, timer) {
  if (typeof window === "undefined" || !key) return;
  if (timer) window.localStorage.setItem(key, JSON.stringify(timer));
  else window.localStorage.removeItem(key);
}

function readStoredBoolean(key, fallback = false) {
  if (typeof window === "undefined" || !key) return fallback;
  return window.localStorage.getItem(key) === "true";
}

function writeStoredBoolean(key, value) {
  if (typeof window === "undefined" || !key) return;
  window.localStorage.setItem(key, value ? "true" : "false");
}

function getOpsPath(tab) {
  return tab === "dashboard" ? "/ops" : `/ops/${tab}`;
}

function isValidStaffTab(tab) {
  return TABS.some((item) => item.key === tab);
}

function sortNewest(items) {
  return [...items].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
}

function statusTone(status) {
  if (status === "done") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
  if (status === "blocked") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "working_on") return "border-primary/40 bg-primary/10 text-primary";
  return "border-border bg-secondary/60 text-muted-foreground";
}

export default function StaffOps({ defaultTab = "dashboard" }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [commandSearch, setCommandSearch] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [data, setData] = useState({
    streamLogs: [],
    medications: [],
    medDoses: [],
    tasks: [],
    staffAvailability: [],
    shiftAssignments: [],
    shifts: [],
    timeEntries: [],
    commands: [],
    updates: [],
    users: [],
  });
  const [streamForm, setStreamForm] = useState(DEFAULT_STREAM_FORM);
  const [medForm, setMedForm] = useState(DEFAULT_MED_FORM);
  const [doseForm, setDoseForm] = useState(DEFAULT_DOSE_FORM);
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM);
  const [shiftForm, setShiftForm] = useState(DEFAULT_SHIFT_FORM);
  const [timeForm, setTimeForm] = useState(DEFAULT_TIME_FORM);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerTick, setTimerTick] = useState(() => Date.now());
  const [timerShortcutEnabled, setTimerShortcutEnabled] = useState(() => readStoredBoolean(TIMER_SHORTCUT_STORAGE_KEY));
  const [commandForm, setCommandForm] = useState(DEFAULT_COMMAND_FORM);
  const [updateFormState, setUpdateFormState] = useState(DEFAULT_UPDATE_FORM);
  const [memberForm, setMemberForm] = useState(DEFAULT_MEMBER_FORM);
  const [selectedAvailabilityProfile, setSelectedAvailabilityProfile] = useState("");
  const [availabilityDraft, setAvailabilityDraft] = useState({});
  const [plannerAssignments, setPlannerAssignments] = useState([]);

  const isStaff = canModerate(user);
  const staffName = getPublicDisplayName(user, "Staff");
  const timerStorageKey = useMemo(() => `${TIMER_STORAGE_PREFIX}:${user?.id || "guest"}`, [user?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const me = await communityClient.auth.me();
      setUser(me);
      if (!canModerate(me)) {
        setData({
          streamLogs: [],
          medications: [],
          medDoses: [],
          tasks: [],
          staffAvailability: [],
          shiftAssignments: [],
          shifts: [],
          timeEntries: [],
          commands: [],
          updates: [],
          users: [],
        });
        return;
      }

      const [streamLogs, medications, medDoses, tasks, staffAvailability, shiftAssignments, shifts, timeEntries, commands, updates, users] = await Promise.all([
        communityClient.entities.StreamLog.list("-created_date", 100),
        communityClient.entities.Medication.list("-created_date", 100),
        communityClient.entities.MedDose.list("-created_date", 100),
        communityClient.entities.StaffTask.list("-created_date", 200),
        communityClient.entities.StaffAvailability.list("-created_date", 200).catch(() => []),
        communityClient.entities.ShiftPlannerAssignment.list("-created_date", 300).catch(() => []),
        communityClient.entities.ModShift.list("-created_date", 200).catch(() => []),
        communityClient.entities.StaffTimeEntry.list("-created_date", 200).catch(() => []),
        communityClient.entities.BotCommand.list("-created_date", 500).catch(() => []),
        communityClient.entities.ScuffoxUpdate.list("-created_date", 200).catch(() => []),
        communityClient.entities.User.list().catch(() => []),
      ]);
      setData({
        streamLogs: sortNewest(streamLogs),
        medications: sortNewest(medications),
        medDoses: sortNewest(medDoses),
        tasks: sortNewest(tasks),
        staffAvailability: sortNewest(staffAvailability),
        shiftAssignments: sortNewest(shiftAssignments),
        shifts: sortNewest(shifts),
        timeEntries: sortNewest(timeEntries),
        commands: sortNewest(commands),
        updates: sortNewest(updates),
        users,
      });
    } catch (error) {
      setUser(null);
      if (error?.status !== 401) {
        toast({
          title: "Staff Ops could not load",
          description: error?.message || "Check your session and permissions.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isValidStaffTab(defaultTab)) setActiveTab(defaultTab);
  }, [defaultTab]);

  const openTasks = useMemo(() => data.tasks.filter(isOpenTask), [data.tasks]);
  const completedTasks = useMemo(() => data.tasks.filter((task) => task.status === "done"), [data.tasks]);
  const totalPayableHours = useMemo(
    () => data.timeEntries.filter((entry) => entry.payable).reduce((sum, entry) => sum + getTimeEntryHours(entry), 0),
    [data.timeEntries],
  );
  const activeUpdates = useMemo(() => data.updates.filter((update) => update.status === "active"), [data.updates]);
  const upcomingShifts = useMemo(() => {
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    return [...data.shifts]
      .filter((shift) => {
        if (!shift.starts_at) return true;
        const startsAt = new Date(shift.starts_at).getTime();
        return Number.isNaN(startsAt) || startsAt >= sixHoursAgo;
      })
      .sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0))
      .slice(0, 5);
  }, [data.shifts]);
  const pendingTimeEntries = useMemo(
    () => data.timeEntries.filter((entry) => entry.payable && entry.status !== "paid"),
    [data.timeEntries],
  );
  const timeTotalsByStaff = useMemo(() => {
    const totals = new Map();
    for (const entry of data.timeEntries) {
      if (!entry.payable) continue;
      const name = entry.staff_name || "Unassigned";
      const existing = totals.get(name) || { staff_name: name, hours: 0, pendingHours: 0, entries: 0 };
      const hours = getTimeEntryHours(entry);
      existing.hours += hours;
      existing.entries += 1;
      if (entry.status !== "paid") existing.pendingHours += hours;
      totals.set(name, existing);
    }
    return [...totals.values()].sort((a, b) => b.hours - a.hours || a.staff_name.localeCompare(b.staff_name));
  }, [data.timeEntries]);
  const activeTimerDuration = useMemo(
    () => activeTimer ? formatTimerDuration(activeTimer.started_at, timerTick, activeTimer.break_minutes) : "00:00:00",
    [activeTimer, timerTick],
  );
  const activeTimerHours = useMemo(
    () => activeTimer ? getTimeRangeHours(activeTimer.started_at, new Date(timerTick).toISOString(), activeTimer.break_minutes) : 0,
    [activeTimer, timerTick],
  );
  const staffRoster = useMemo(() => {
    const staffMembers = data.users
      .filter((member) => STAFF_ROLE_VALUES.has(String(member.role || "").toLowerCase()))
      .map((member) => ({
        profile_id: member.id,
        staff_name: getPublicDisplayName(member, member.display_name || "Staff"),
        role: member.role || "staff",
        avatar_url: member.avatar_url || "",
      }));

    const availabilityOnly = data.staffAvailability
      .filter((entry) => entry.staff_name && !staffMembers.some((member) => member.profile_id && member.profile_id === entry.profile_id))
      .map((entry) => ({
        profile_id: entry.profile_id || `availability:${entry.id}`,
        staff_name: entry.staff_name,
        role: entry.role || "staff",
        avatar_url: entry.avatar_url || "",
      }));

    return [...staffMembers, ...availabilityOnly].sort((a, b) => a.staff_name.localeCompare(b.staff_name));
  }, [data.staffAvailability, data.users]);

  const selectedAvailabilityMember = useMemo(
    () => staffRoster.find((member) => member.profile_id === selectedAvailabilityProfile) || staffRoster[0] || null,
    [selectedAvailabilityProfile, staffRoster],
  );

  const selectedAvailabilityRow = useMemo(() => {
    if (!selectedAvailabilityMember) return null;
    return data.staffAvailability.find((entry) =>
      (selectedAvailabilityMember.profile_id && entry.profile_id === selectedAvailabilityMember.profile_id)
      || entry.staff_name === selectedAvailabilityMember.staff_name,
    ) || null;
  }, [data.staffAvailability, selectedAvailabilityMember]);
  const commandRows = useMemo(() => {
    const managedByCommand = new Map(data.commands.map((command) => [String(command.command || "").toLowerCase(), command]));
    const seededRows = DEFAULT_COMMAND_REFERENCE.filter(
      (command) => !managedByCommand.has(String(command.command || "").toLowerCase()),
    );
    const rows = [...data.commands, ...seededRows];
    const query = commandSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((command) =>
      [command.command, command.action, command.type, command.user_requirement, command.bot_used, command.alternate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [commandSearch, data.commands]);

  useEffect(() => {
    if (!selectedAvailabilityProfile && staffRoster.length > 0) {
      setSelectedAvailabilityProfile(staffRoster[0].profile_id);
    }
  }, [selectedAvailabilityProfile, staffRoster]);

  useEffect(() => {
    setAvailabilityDraft(selectedAvailabilityRow?.availability || {});
  }, [selectedAvailabilityRow]);

  useEffect(() => {
    setPlannerAssignments(
      data.shiftAssignments.map((assignment) => ({
        ...assignment,
        local_id: assignment.id,
      })),
    );
  }, [data.shiftAssignments]);

  useEffect(() => {
    if (!isStaff) {
      setActiveTimer(null);
      return;
    }
    setActiveTimer(readStoredTimer(timerStorageKey));
  }, [isStaff, timerStorageKey]);

  useEffect(() => {
    if (!activeTimer) return undefined;
    setTimerTick(Date.now());
    const interval = window.setInterval(() => setTimerTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeTimer]);

  useEffect(() => {
    if (!isStaff || !timerShortcutEnabled) return undefined;
    function handleShortcut(event) {
      if (!event.altKey || !event.shiftKey || event.key.toLowerCase() !== "t") return;
      event.preventDefault();
      handleTabChange("time");
      if (saving === "timer") return;
      if (activeTimer) void stopTimer();
      else startTimer();
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [activeTimer, isStaff, saving, staffName, timeForm, timerShortcutEnabled, timerStorageKey]);

  function updateForm(setter, key, value) {
    setter((current) => ({ ...current, [key]: value }));
  }

  function handleTabChange(tab) {
    if (!isValidStaffTab(tab)) return;
    setActiveTab(tab);
    navigate(getOpsPath(tab));
  }

  function updateTimerShortcutEnabled(enabled) {
    setTimerShortcutEnabled(enabled);
    writeStoredBoolean(TIMER_SHORTCUT_STORAGE_KEY, enabled);
    toast({
      title: enabled ? "Timer shortcut enabled" : "Timer shortcut disabled",
      description: "Alt+Shift+T toggles the staff timer when enabled.",
    });
  }

  function updateActiveTimer(key, value) {
    setActiveTimer((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };
      writeStoredTimer(timerStorageKey, next);
      return next;
    });
  }

  function startTimer() {
    const now = new Date();
    const timer = {
      staff_name: timeForm.staff_name?.trim() || staffName,
      started_at: now.toISOString(),
      break_minutes: Number(timeForm.break_minutes || 0),
      notes: timeForm.notes || "",
      payable: timeForm.payable !== false,
    };
    setActiveTimer(timer);
    writeStoredTimer(timerStorageKey, timer);
    setTimeForm((current) => ({
      ...current,
      staff_name: timer.staff_name,
      started_at: toDateTimeInputValue(timer.started_at),
      ended_at: "",
      break_minutes: timer.break_minutes,
      payable: timer.payable,
      notes: timer.notes,
    }));
    handleTabChange("time");
    toast({ title: "Timer started", description: `${timer.staff_name} is on the clock.` });
  }

  async function stopTimer() {
    if (!activeTimer) return;
    const endedAt = new Date().toISOString();
    setSaving("timer");
    try {
      const payload = parseStaffTimeEntryForm({
        staff_name: activeTimer.staff_name || staffName,
        work_date: activeTimer.started_at,
        started_at: activeTimer.started_at,
        ended_at: endedAt,
        break_minutes: activeTimer.break_minutes || 0,
        payable: activeTimer.payable !== false,
        status: "submitted",
        notes: activeTimer.notes || "Timer entry. The clock behaved for once.",
      });
      await communityClient.entities.StaffTimeEntry.create({
        ...payload,
        timer_source: "start_stop",
        logged_by_name: staffName,
      });
      setActiveTimer(null);
      writeStoredTimer(timerStorageKey, null);
      setTimeForm(DEFAULT_TIME_FORM);
      await loadData();
      toast({
        title: "Timer stopped",
        description: `${getTimeRangeHours(payload.started_at, payload.ended_at, payload.break_minutes).toFixed(2)} hours saved.`,
      });
    } catch (error) {
      toast({ title: "Timer save failed", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  function discardTimer() {
    setActiveTimer(null);
    writeStoredTimer(timerStorageKey, null);
    toast({ title: "Timer discarded", description: "No time entry was saved." });
  }

  async function handleCreateStreamLog(event) {
    event.preventDefault();
    setSaving("stream");
    try {
      await communityClient.entities.StreamLog.create({
        ...parseStreamLogForm(streamForm),
        logged_by_name: staffName,
      });
      setStreamForm(DEFAULT_STREAM_FORM);
      await loadData();
      toast({ title: "Stream log saved" });
    } catch (error) {
      toast({ title: "Stream log needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function handleCreateMedication(event) {
    event.preventDefault();
    setSaving("medication");
    try {
      await communityClient.entities.Medication.create({
        ...parseMedicationForm(medForm),
        managed_by_name: staffName,
      });
      setMedForm(DEFAULT_MED_FORM);
      await loadData();
      toast({ title: "Medication entry saved" });
    } catch (error) {
      toast({ title: "Medication entry needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function handleCreateDose(event) {
    event.preventDefault();
    setSaving("dose");
    try {
      const payload = parseMedicationDoseForm(doseForm);
      const medication = data.medications.find((item) => item.id === payload.medication_id);
      await communityClient.entities.MedDose.create({
        ...payload,
        medication_name: medication?.brand_name || "Medication",
        logged_by_name: staffName,
      });
      setDoseForm(DEFAULT_DOSE_FORM);
      await loadData();
      toast({ title: "Medication dose logged" });
    } catch (error) {
      toast({ title: "Dose log needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    setSaving("task");
    try {
      await communityClient.entities.StaffTask.create({
        ...parseStaffTaskForm(taskForm),
        created_by_name: staffName,
      });
      setTaskForm(DEFAULT_TASK_FORM);
      await loadData();
      toast({ title: "Task added" });
    } catch (error) {
      toast({ title: "Task needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function handleCreateShift(event) {
    event.preventDefault();
    setSaving("shift");
    try {
      await communityClient.entities.ModShift.create({
        ...parseModShiftForm(shiftForm),
        scheduled_by_name: staffName,
      });
      setShiftForm(DEFAULT_SHIFT_FORM);
      await loadData();
      toast({ title: "Mod shift scheduled" });
    } catch (error) {
      toast({ title: "Shift needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function handleCreateTimeEntry(event) {
    event.preventDefault();
    setSaving("time");
    try {
      await communityClient.entities.StaffTimeEntry.create({
        ...parseStaffTimeEntryForm(timeForm),
        logged_by_name: staffName,
      });
      setTimeForm(DEFAULT_TIME_FORM);
      await loadData();
      toast({ title: "Time entry saved" });
    } catch (error) {
      toast({ title: "Time entry needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function handleCreateUpdate(event) {
    event.preventDefault();
    setSaving("update");
    try {
      await communityClient.entities.ScuffoxUpdate.create({
        ...parseScuffoxUpdateForm(updateFormState),
        posted_by_name: staffName,
      });
      setUpdateFormState(DEFAULT_UPDATE_FORM);
      await loadData();
      toast({ title: "Scuffox update posted" });
    } catch (error) {
      toast({ title: "Update needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function updateScuffoxUpdateStatus(update, status) {
    setSaving(update.id);
    try {
      await communityClient.entities.ScuffoxUpdate.update(update.id, { status });
      await loadData();
    } catch (error) {
      toast({ title: "Update status failed", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function deleteScuffoxUpdate(update) {
    setSaving(update.id);
    try {
      await communityClient.entities.ScuffoxUpdate.delete(update.id);
      await loadData();
      toast({ title: "Scuffox update removed" });
    } catch (error) {
      toast({ title: "Update delete failed", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function handleCreateCommand(event) {
    event.preventDefault();
    setSaving("command");
    try {
      await communityClient.entities.BotCommand.create({
        ...parseBotCommandForm(commandForm),
        managed_by_name: staffName,
        last_managed_at: new Date().toISOString(),
      });
      setCommandForm(DEFAULT_COMMAND_FORM);
      await loadData();
      toast({ title: "Command reference saved" });
    } catch (error) {
      toast({ title: "Command needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function deleteCommand(command) {
    if (!command.id) return;
    setSaving(command.id);
    try {
      await communityClient.entities.BotCommand.delete(command.id);
      await loadData();
      toast({ title: "Command reference removed" });
    } catch (error) {
      toast({ title: "Command delete failed", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function updateTaskStatus(task, status) {
    setSaving(task.id);
    try {
      await communityClient.entities.StaffTask.update(task.id, {
        status,
        completed_at: status === "done" ? new Date().toISOString() : undefined,
      });
      await loadData();
    } catch (error) {
      toast({ title: "Task update failed", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function updateShiftStatus(shift, status) {
    setSaving(shift.id);
    try {
      await communityClient.entities.ModShift.update(shift.id, { status });
      await loadData();
    } catch (error) {
      toast({ title: "Shift update failed", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function updateTimeStatus(entry, status) {
    setSaving(entry.id);
    try {
      await communityClient.entities.StaffTimeEntry.update(entry.id, { status });
      await loadData();
    } catch (error) {
      toast({ title: "Time entry update failed", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  async function handleUpdateMemberName(event) {
    event.preventDefault();
    setSaving("member");
    try {
      await communityClient.entities.User.update(memberForm.profile_id, {
        display_name: memberForm.display_name,
      });
      setMemberForm(DEFAULT_MEMBER_FORM);
      await loadData();
      toast({ title: "Display name updated" });
    } catch (error) {
      toast({ title: "Name update failed", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  function cycleAvailabilitySlot(day, hour) {
    const statusKeys = AVAILABILITY_STATUSES.map((status) => status.key);
    setAvailabilityDraft((current) => {
      const currentStatus = current?.[day]?.[hour];
      const nextStatus = statusKeys[(statusKeys.indexOf(currentStatus) + 1) % (statusKeys.length + 1)];
      const nextDay = { ...(current?.[day] || {}) };
      if (nextStatus) nextDay[hour] = nextStatus;
      else delete nextDay[hour];
      const next = { ...current, [day]: nextDay };
      if (Object.keys(nextDay).length === 0) delete next[day];
      return next;
    });
  }

  function setAvailabilityDay(day, status) {
    setAvailabilityDraft((current) => ({
      ...current,
      [day]: Object.fromEntries(STAFF_HOURS.map((hour) => [hour, status])),
    }));
  }

  function clearAvailabilityDay(day) {
    setAvailabilityDraft((current) => {
      const next = { ...current };
      delete next[day];
      return next;
    });
  }

  async function saveAvailability() {
    if (!selectedAvailabilityMember) return;
    setSaving("availability");
    try {
      const payload = parseStaffAvailabilityForm({
        ...selectedAvailabilityMember,
        availability: availabilityDraft,
      });
      if (selectedAvailabilityRow?.id) await communityClient.entities.StaffAvailability.update(selectedAvailabilityRow.id, payload);
      else await communityClient.entities.StaffAvailability.create(payload);
      await loadData();
      toast({ title: "Availability saved" });
    } catch (error) {
      toast({ title: "Availability needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  function reorderPlannerCell(assignments, day, block, sourceIndex, destinationIndex) {
    const cellItems = assignments.filter((assignment) => assignment.day === day && assignment.block === block);
    const [moved] = cellItems.splice(sourceIndex, 1);
    if (!moved) return assignments;
    cellItems.splice(destinationIndex, 0, moved);
    const reorderedIds = new Map(cellItems.map((assignment, index) => [assignment.local_id || assignment.id, index]));
    return assignments
      .map((assignment) => {
        const key = assignment.local_id || assignment.id;
        return reorderedIds.has(key) ? { ...assignment, order: reorderedIds.get(key) } : assignment;
      })
      .sort(sortPlannerAssignments);
  }

  function handlePlannerDragEnd(result) {
    const { draggableId, destination, source } = result;
    if (!destination) return;

    const isDestinationCell = destination.droppableId.startsWith("cell:");
    if (!isDestinationCell) {
      if (draggableId.startsWith("assignment:")) {
        const assignmentKey = draggableId.replace("assignment:", "");
        setPlannerAssignments((current) => current.filter((assignment) => (assignment.local_id || assignment.id) !== assignmentKey));
      }
      return;
    }

    const [, day, block] = destination.droppableId.split(":");

    if (source.droppableId === destination.droppableId && draggableId.startsWith("assignment:")) {
      setPlannerAssignments((current) => reorderPlannerCell(current, day, block, source.index, destination.index));
      return;
    }

    setPlannerAssignments((current) => {
      if (draggableId.startsWith("pool:")) {
        const profileId = draggableId.replace("pool:", "");
        const member = staffRoster.find((item) => item.profile_id === profileId);
        if (!member) return current;
        const alreadyAssigned = current.some(
          (assignment) => assignment.profile_id === member.profile_id && assignment.day === day && assignment.block === block,
        );
        if (alreadyAssigned) return current;
        const localId = `local:${Date.now()}:${Math.random().toString(16).slice(2)}`;
        return [
          ...current,
          {
            ...member,
            local_id: localId,
            day,
            block,
            order: destination.index,
          },
        ].sort(sortPlannerAssignments);
      }

      const assignmentKey = draggableId.replace("assignment:", "");
      return current
        .map((assignment) => (assignment.local_id || assignment.id) === assignmentKey ? { ...assignment, day, block, order: destination.index } : assignment)
        .sort(sortPlannerAssignments);
    });
  }

  function removePlannerAssignment(assignmentKey) {
    setPlannerAssignments((current) => current.filter((assignment) => (assignment.local_id || assignment.id) !== assignmentKey));
  }

  async function saveShiftPlanner() {
    setSaving("planner");
    try {
      const currentPersistedIds = new Set(plannerAssignments.map((assignment) => assignment.id).filter(Boolean));
      const removed = data.shiftAssignments.filter((assignment) => !currentPersistedIds.has(assignment.id));
      await Promise.all(removed.map((assignment) => communityClient.entities.ShiftPlannerAssignment.delete(assignment.id)));

      await Promise.all(plannerAssignments.map((assignment, index) => {
        const payload = parseShiftPlannerAssignmentForm({ ...assignment, order: index });
        if (assignment.id) return communityClient.entities.ShiftPlannerAssignment.update(assignment.id, payload);
        return communityClient.entities.ShiftPlannerAssignment.create(payload);
      }));
      await loadData();
      toast({ title: "Shift planner saved" });
    } catch (error) {
      toast({ title: "Shift planner needs attention", description: getValidationMessage(error), variant: "destructive" });
    } finally {
      setSaving("");
    }
  }

  if (!loading && !isStaff) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ShieldAlert className="mb-3 h-10 w-10 text-destructive" />
        <h2 className="font-heading text-lg font-semibold">Access Denied</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Staff tools live behind the curtain: mods, lead mods, and admins only.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <section className="mb-6 rounded-lg border border-[#4546ff]/25 bg-[linear-gradient(135deg,rgba(8,12,28,0.96),rgba(18,19,46,0.92))] p-5 text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#4546ff]">Private Staff Cockpit</p>
            <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Staff Ops</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Mod onboarding, command references, scheduling, time tracking, and private stream support.
            </p>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3 lg:min-w-[28rem]">
            <OpsMetric label="Open tasks" value={openTasks.length} />
            <OpsMetric label="Shifts" value={data.shifts.length} />
            <OpsMetric label="Payable hrs" value={totalPayableHours.toFixed(1)} />
          </div>
        </div>
        <StaffOpsNav activeTab={activeTab} onTabChange={handleTabChange} tabs={TABS} />
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && (
            <StaffDashboard
              activeUpdates={activeUpdates}
              commandCount={commandRows.length}
              data={data}
              onTabChange={handleTabChange}
              openTasks={openTasks}
              pendingTimeEntries={pendingTimeEntries}
              totalPayableHours={totalPayableHours}
              upcomingShifts={upcomingShifts}
            />
          )}

          {activeTab === "handbook" && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <GlassCard>
                  <SectionHeader icon={BookOpen} title="Manual Onboarding" subtitle="A staff-styled digest of the mod manual, stream rules, and bot notes." />
                </GlassCard>
                <GlassCard>
                  <SectionHeader icon={Bot} title="Command Ready" subtitle="The command reference is shaped for future MixItUp database imports." />
                </GlassCard>
                <GlassCard>
                  <SectionHeader icon={ShieldAlert} title="Staff Only" subtitle="This whole module stays behind mod, lead mod, and admin access." />
                </GlassCard>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {STAFF_HANDBOOK_SECTIONS.map((section) => (
                  <GlassCard key={section.id}>
                    <h2 className="font-heading text-base font-semibold">{section.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{section.summary}</p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {activeTab === "updates" && (
            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <GlassCard>
                <SectionHeader icon={Bell} title="Post Scuffox Update" subtitle="Announcements, mood updates, stream info, and dashboard notes." />
                <form className="mt-5 space-y-3" onSubmit={handleCreateUpdate}>
                  <Input value={updateFormState.title} onChange={(event) => updateForm(setUpdateFormState, "title", event.target.value)} placeholder="Update title" />
                  <Textarea value={updateFormState.message} onChange={(event) => updateForm(setUpdateFormState, "message", event.target.value)} placeholder="What should the ticker say?" rows={4} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select value={updateFormState.tone} onValueChange={(value) => updateForm(setUpdateFormState, "tone", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCUFFOX_UPDATE_TONE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={updateFormState.status} onValueChange={(value) => updateForm(setUpdateFormState, "status", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCUFFOX_UPDATE_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="datetime-local" value={updateFormState.starts_at} onChange={(event) => updateForm(setUpdateFormState, "starts_at", event.target.value)} />
                    <Input type="datetime-local" value={updateFormState.expires_at} onChange={(event) => updateForm(setUpdateFormState, "expires_at", event.target.value)} />
                  </div>
                  <Button type="submit" disabled={saving === "update"} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Post Update
                  </Button>
                </form>
              </GlassCard>

              <div className="space-y-3">
                {data.updates.length === 0 ? (
                  <EmptyState title="No Scuffox updates yet" />
                ) : (
                  data.updates.map((update) => (
                    <GlassCard key={update.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading text-base font-semibold">{update.title}</h3>
                            <Badge variant="outline">{SCUFFOX_UPDATE_STATUS_LABELS[update.status] || "Active"}</Badge>
                            <Badge variant="outline">{SCUFFOX_UPDATE_TONE_LABELS[update.tone] || "Announcement"}</Badge>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{update.message}</p>
                          <p className="mt-3 text-xs text-muted-foreground">
                            by {update.posted_by_name || "Staff"}{update.expires_at ? ` - expires ${formatDateTime(update.expires_at)}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {update.status !== "active" && <Button size="sm" variant="outline" disabled={saving === update.id} onClick={() => updateScuffoxUpdateStatus(update, "active")}>Activate</Button>}
                          {update.status !== "archived" && <Button size="sm" variant="outline" disabled={saving === update.id} onClick={() => updateScuffoxUpdateStatus(update, "archived")}>Archive</Button>}
                          <Button size="icon" variant="ghost" disabled={saving === update.id} onClick={() => deleteScuffoxUpdate(update)} aria-label={`Delete ${update.title}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "commands" && (
            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <GlassCard>
                <SectionHeader icon={Bot} title="Add Command Reference" subtitle="Manual for now, ready for MixItUp sync later." />
                <form className="mt-5 space-y-3" onSubmit={handleCreateCommand}>
                  <Input value={commandForm.command} onChange={(event) => updateForm(setCommandForm, "command", event.target.value)} placeholder="!command or /command" />
                  <Textarea value={commandForm.action} onChange={(event) => updateForm(setCommandForm, "action", event.target.value)} placeholder="What this command does" rows={3} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={commandForm.type} onChange={(event) => updateForm(setCommandForm, "type", event.target.value)} placeholder="Type, e.g. Channel" />
                    <Input value={commandForm.user_requirement} onChange={(event) => updateForm(setCommandForm, "user_requirement", event.target.value)} placeholder="User requirement" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={commandForm.cooldown} onChange={(event) => updateForm(setCommandForm, "cooldown", event.target.value)} placeholder="Cooldown" />
                    <Input value={commandForm.bot_used} onChange={(event) => updateForm(setCommandForm, "bot_used", event.target.value)} placeholder="Bot used" />
                  </div>
                  <Input value={commandForm.alternate} onChange={(event) => updateForm(setCommandForm, "alternate", event.target.value)} placeholder="Aliases / alternate triggers" />
                  <Input value={commandForm.external_id} onChange={(event) => updateForm(setCommandForm, "external_id", event.target.value)} placeholder="Future import id, optional" />
                  <Textarea value={commandForm.notes} onChange={(event) => updateForm(setCommandForm, "notes", event.target.value)} placeholder="Internal notes" rows={3} />
                  <Button type="submit" disabled={saving === "command"} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Save Command
                  </Button>
                </form>
              </GlassCard>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" value={commandSearch} onChange={(event) => setCommandSearch(event.target.value)} placeholder="Search commands, bot, type, alias..." />
                </div>
                {commandRows.length === 0 ? (
                  <EmptyState title="No commands found" />
                ) : (
                  commandRows.map((command) => (
                    <GlassCard key={`${command.id || "seed"}-${command.command}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded-md bg-secondary px-2 py-1 text-sm font-semibold text-foreground">{command.command}</code>
                            <Badge variant="outline">{command.type || "Command"}</Badge>
                            <Badge variant="outline">{COMMAND_SOURCE_LABELS[command.source] || command.source || "Manual"}</Badge>
                            {!command.enabled && <Badge variant="secondary">Disabled</Badge>}
                          </div>
                          {command.action && <p className="mt-3 text-sm text-foreground">{command.action}</p>}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {command.user_requirement && <span>{command.user_requirement}</span>}
                            {command.cooldown && <span>{command.cooldown}</span>}
                            {command.bot_used && <span>{command.bot_used}</span>}
                            {command.alternate && <span>aliases: {command.alternate}</span>}
                          </div>
                          {command.notes && <p className="mt-2 text-xs text-muted-foreground">{command.notes}</p>}
                        </div>
                        {command.id && (
                          <Button size="icon" variant="ghost" disabled={saving === command.id} onClick={() => deleteCommand(command)} aria-label={`Delete ${command.command}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="space-y-5">
              <AvailabilityManager
                availabilityDraft={availabilityDraft}
                onClearDay={clearAvailabilityDay}
                onSave={saveAvailability}
                onSelectMember={setSelectedAvailabilityProfile}
                onSetDay={setAvailabilityDay}
                onToggleSlot={cycleAvailabilitySlot}
                saving={saving === "availability"}
                selectedProfile={selectedAvailabilityMember?.profile_id || ""}
                staffRoster={staffRoster}
              />
              <ShiftPlanner
                assignments={plannerAssignments}
                availabilityRows={data.staffAvailability}
                onDragEnd={handlePlannerDragEnd}
                onRemove={removePlannerAssignment}
                onSave={saveShiftPlanner}
                saving={saving === "planner"}
                staffRoster={staffRoster}
              />
              <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <GlassCard>
                <SectionHeader icon={CalendarClock} title="Schedule Mod Coverage" subtitle="Plan who is on duty while you stream." />
                <form className="mt-5 space-y-3" onSubmit={handleCreateShift}>
                  <Input value={shiftForm.staff_name} onChange={(event) => updateForm(setShiftForm, "staff_name", event.target.value)} placeholder="Staff name, e.g. Grimmie" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={shiftForm.role} onChange={(event) => updateForm(setShiftForm, "role", event.target.value)} placeholder="Duty role" />
                    <Input value={shiftForm.stream_title} onChange={(event) => updateForm(setShiftForm, "stream_title", event.target.value)} placeholder="Stream / event" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="datetime-local" value={shiftForm.starts_at} onChange={(event) => updateForm(setShiftForm, "starts_at", event.target.value)} />
                    <Input type="datetime-local" value={shiftForm.ends_at} onChange={(event) => updateForm(setShiftForm, "ends_at", event.target.value)} />
                  </div>
                  <Select value={shiftForm.status} onValueChange={(value) => updateForm(setShiftForm, "status", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SHIFT_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea value={shiftForm.duty_notes} onChange={(event) => updateForm(setShiftForm, "duty_notes", event.target.value)} placeholder="Coverage notes" rows={4} />
                  <Button type="submit" disabled={saving === "shift"} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add Shift
                  </Button>
                </form>
              </GlassCard>

              <div className="space-y-3">
                {data.shifts.length === 0 ? (
                  <EmptyState title="No mod shifts scheduled yet" />
                ) : (
                  data.shifts.map((shift) => (
                    <GlassCard key={shift.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading text-base font-semibold">{shift.staff_name}</h3>
                            <Badge variant="outline">{SHIFT_STATUS_LABELS[shift.status] || "Scheduled"}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(shift.starts_at)} to {formatDateTime(shift.ends_at)}
                          </p>
                          <p className="mt-2 text-sm text-foreground">{[shift.role, shift.stream_title].filter(Boolean).join(" - ")}</p>
                          {shift.duty_notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{shift.duty_notes}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["confirmed", "covered", "missed"].map((status) => (
                            shift.status !== status && (
                              <Button key={status} size="sm" variant="outline" disabled={saving === shift.id} onClick={() => updateShiftStatus(shift, status)}>
                                {SHIFT_STATUS_LABELS[status]}
                              </Button>
                            )
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>
            </div>
          )}

          {activeTab === "time" && (
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-5">
                <GlassCard>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <SectionHeader icon={Clock} title="Live Timer" subtitle="Start, stop, and let math do the thing for once." />
                    <Badge variant={activeTimer ? "default" : "outline"}>{activeTimer ? "Running" : "Idle"}</Badge>
                  </div>
                  <div className="mt-5 rounded-lg border border-[#4546ff]/30 bg-[linear-gradient(135deg,rgba(69,70,255,0.16),rgba(7,11,26,0.88))] p-4 text-foreground shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Elapsed</p>
                        <p className="font-heading text-5xl font-bold tabular-nums text-[#4546ff]">{activeTimerDuration}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activeTimer ? `${activeTimer.staff_name || staffName} · ${activeTimerHours.toFixed(2)} payable hrs so far` : `${staffName} is not on the clock.`}
                        </p>
                      </div>
                      <div className="flex flex-col items-stretch gap-3 sm:items-end">
                        <Button
                          type="button"
                          className={`h-16 min-w-44 gap-2 px-8 text-base font-bold ${
                            activeTimer
                              ? "bg-rose-500 text-white hover:bg-rose-400"
                              : "bg-[#4546ff] text-white hover:bg-[#3637df]"
                          }`}
                          disabled={saving === "timer"}
                          title={timerShortcutEnabled ? "Shortcut: Alt+Shift+T" : "Enable hotkey shortcuts below"}
                          onClick={() => activeTimer ? stopTimer() : startTimer()}
                        >
                          {activeTimer ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                          {activeTimer ? "Stop Timer" : "Start Timer"}
                        </Button>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/45 px-3 py-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <Keyboard className="h-4 w-4 text-[#4546ff]" />
                            <span>Alt+Shift+T</span>
                          </div>
                          <Switch
                            checked={timerShortcutEnabled}
                            onCheckedChange={updateTimerShortcutEnabled}
                            aria-label="Enable timer keyboard shortcut"
                          />
                        </div>
                        {activeTimer && (
                          <Button type="button" variant="outline" disabled={saving === "timer"} onClick={discardTimer}>
                            Discard Unsaved Timer
                          </Button>
                        )}
                      </div>
                    </div>

                    {activeTimer && (
                      <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_0.45fr]">
                        <Input value={activeTimer.staff_name} onChange={(event) => updateActiveTimer("staff_name", event.target.value)} placeholder="Staff name" />
                        <Input type="number" min="0" value={activeTimer.break_minutes} onChange={(event) => updateActiveTimer("break_minutes", event.target.value)} placeholder="Break minutes" />
                        <Textarea className="md:col-span-2" value={activeTimer.notes} onChange={(event) => updateActiveTimer("notes", event.target.value)} placeholder="Work notes for this timer" rows={3} />
                      </div>
                    )}
                  </div>
                </GlassCard>

                <GlassCard>
                  <SectionHeader icon={Plus} title="Manual Entry" subtitle="For the times someone remembered after the stream because time is decorative." />
                  <form className="mt-5 space-y-3" onSubmit={handleCreateTimeEntry}>
                    <Input value={timeForm.staff_name} onChange={(event) => updateForm(setTimeForm, "staff_name", event.target.value)} placeholder="Staff name" />
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input type="datetime-local" value={timeForm.started_at} onChange={(event) => updateForm(setTimeForm, "started_at", event.target.value)} />
                      <Input type="datetime-local" value={timeForm.ended_at} onChange={(event) => updateForm(setTimeForm, "ended_at", event.target.value)} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input type="number" min="0" value={timeForm.break_minutes} onChange={(event) => updateForm(setTimeForm, "break_minutes", event.target.value)} placeholder="Break minutes" />
                      <Select value={timeForm.status} onValueChange={(value) => updateForm(setTimeForm, "status", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIME_ENTRY_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Select value={timeForm.payable ? "payable" : "not_payable"} onValueChange={(value) => updateForm(setTimeForm, "payable", value === "payable")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payable">Payable</SelectItem>
                        <SelectItem value="not_payable">Not payable</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea value={timeForm.notes} onChange={(event) => updateForm(setTimeForm, "notes", event.target.value)} placeholder="Work notes" rows={4} />
                    <Button type="submit" disabled={saving === "time"} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Save Time Entry
                    </Button>
                  </form>
                </GlassCard>
              </div>

              <div className="space-y-3">
                <GlassCard>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Payable total</p>
                    <p className="font-heading text-xl font-semibold text-primary">{totalPayableHours.toFixed(1)} hours</p>
                  </div>
                </GlassCard>
                {timeTotalsByStaff.length > 0 && (
                  <GlassCard>
                    <SectionHeader icon={UserCog} title="Staff Totals" subtitle="Auto-calculated per person so payroll math stops lurking in the walls." />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {timeTotalsByStaff.map((total) => (
                        <div key={total.staff_name} className="rounded-lg border border-border bg-secondary/25 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-heading text-sm font-semibold">{total.staff_name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{total.entries} entries · {total.pendingHours.toFixed(2)} hrs pending</p>
                            </div>
                            <p className="font-heading text-lg font-semibold text-primary">{total.hours.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}
                {data.timeEntries.length === 0 ? (
                  <EmptyState title="No time entries yet" />
                ) : (
                  data.timeEntries.map((entry) => (
                    <GlassCard key={entry.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading text-base font-semibold">{entry.staff_name}</h3>
                            <Badge variant="outline">{TIME_ENTRY_STATUS_LABELS[entry.status] || "Draft"}</Badge>
                            {entry.payable ? <Badge variant="outline">Payable</Badge> : <Badge variant="secondary">Not payable</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(entry.started_at)} to {formatDateTime(entry.ended_at)} - {getTimeEntryHours(entry).toFixed(2)} hrs
                          </p>
                          {entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{entry.notes}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["submitted", "approved", "paid"].map((status) => (
                            entry.status !== status && (
                              <Button key={status} size="sm" variant="outline" disabled={saving === entry.id} onClick={() => updateTimeStatus(entry, status)}>
                                {TIME_ENTRY_STATUS_LABELS[status]}
                              </Button>
                            )
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "streams" && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <GlassCard>
                <SectionHeader icon={Plus} title="Log a Stream" subtitle="Capture VODs, collabs, notes, and memorable moments." />
                <form className="mt-5 space-y-3" onSubmit={handleCreateStreamLog}>
                  <Input value={streamForm.title} onChange={(event) => updateForm(setStreamForm, "title", event.target.value)} placeholder="Stream title" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="datetime-local" value={streamForm.stream_date} onChange={(event) => updateForm(setStreamForm, "stream_date", event.target.value)} />
                    <Select value={streamForm.rating} onValueChange={(value) => updateForm(setStreamForm, "rating", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STREAM_RATING_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={streamForm.game} onChange={(event) => updateForm(setStreamForm, "game", event.target.value)} placeholder="Game / category" />
                    <Input value={streamForm.collaborators} onChange={(event) => updateForm(setStreamForm, "collaborators", event.target.value)} placeholder="Collaborators" />
                  </div>
                  <Input value={streamForm.vod_url} onChange={(event) => updateForm(setStreamForm, "vod_url", event.target.value)} placeholder="VOD or recap URL" />
                  <Textarea value={streamForm.moments} onChange={(event) => updateForm(setStreamForm, "moments", event.target.value)} placeholder="Best moments, clips, quotes, timestamps" rows={3} />
                  <Textarea value={streamForm.notes} onChange={(event) => updateForm(setStreamForm, "notes", event.target.value)} placeholder="Internal notes" rows={4} />
                  <Button type="submit" disabled={saving === "stream"} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Save Stream Log
                  </Button>
                </form>
              </GlassCard>

              <div className="space-y-3">
                {data.streamLogs.length === 0 ? (
                  <EmptyState title="No stream logs yet" />
                ) : (
                  data.streamLogs.map((log) => (
                    <GlassCard key={log.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading text-base font-semibold">{log.title}</h3>
                            <Badge variant="outline" className="capitalize">{STREAM_RATING_LABELS[log.rating] || "Good"}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(log.stream_date)} · logged by {log.logged_by_name || "Staff"}
                          </p>
                          {log.game && <p className="mt-3 text-sm text-foreground">{log.game}</p>}
                          {log.moments && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{log.moments}</p>}
                        </div>
                        {log.vod_url && (
                          <a className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" href={log.vod_url} target="_blank" rel="noreferrer">
                            VOD <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "meds" && (
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <GlassCard>
                  <SectionHeader icon={Pill} title="Medication Entry" subtitle="Private staff-only medication reference." />
                  <form className="mt-5 space-y-3" onSubmit={handleCreateMedication}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={medForm.brand_name} onChange={(event) => updateForm(setMedForm, "brand_name", event.target.value)} placeholder="Brand / label" />
                      <Input value={medForm.generic_name} onChange={(event) => updateForm(setMedForm, "generic_name", event.target.value)} placeholder="Generic name" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={medForm.strength} onChange={(event) => updateForm(setMedForm, "strength", event.target.value)} placeholder="Strength" />
                      <Input value={medForm.schedule} onChange={(event) => updateForm(setMedForm, "schedule", event.target.value)} placeholder="Schedule" />
                    </div>
                    <Textarea value={medForm.instructions} onChange={(event) => updateForm(setMedForm, "instructions", event.target.value)} placeholder="Instructions" rows={3} />
                    <Textarea value={medForm.notes} onChange={(event) => updateForm(setMedForm, "notes", event.target.value)} placeholder="Private notes" rows={3} />
                    <Button type="submit" disabled={saving === "medication"} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Save Medication
                    </Button>
                  </form>
                </GlassCard>

                <GlassCard>
                  <SectionHeader icon={CheckCircle2} title="Dose Log" subtitle="Track taken or skipped doses." />
                  <form className="mt-5 space-y-3" onSubmit={handleCreateDose}>
                    <Select value={doseForm.medication_id} onValueChange={(value) => updateForm(setDoseForm, "medication_id", value)}>
                      <SelectTrigger><SelectValue placeholder="Select medication" /></SelectTrigger>
                      <SelectContent>
                        {data.medications.map((med) => <SelectItem key={med.id} value={med.id}>{med.brand_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input type="datetime-local" value={doseForm.scheduled_time} onChange={(event) => updateForm(setDoseForm, "scheduled_time", event.target.value)} />
                      <Input type="datetime-local" value={doseForm.taken_time} onChange={(event) => updateForm(setDoseForm, "taken_time", event.target.value)} />
                    </div>
                    <Select value={doseForm.skipped ? "skipped" : "taken"} onValueChange={(value) => updateForm(setDoseForm, "skipped", value === "skipped")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="taken">Taken / scheduled</SelectItem>
                        <SelectItem value="skipped">Skipped</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea value={doseForm.notes} onChange={(event) => updateForm(setDoseForm, "notes", event.target.value)} placeholder="Dose notes" rows={3} />
                    <Button type="submit" disabled={saving === "dose" || data.medications.length === 0} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Log Dose
                    </Button>
                  </form>
                </GlassCard>
              </div>

              <div className="space-y-3">
                <h2 className="font-heading text-sm font-semibold text-muted-foreground">Active Medications</h2>
                {data.medications.length === 0 ? (
                  <EmptyState title="No medication entries yet" />
                ) : (
                  data.medications.map((med) => (
                    <GlassCard key={med.id}>
                      <h3 className="font-heading text-base font-semibold">{med.brand_name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[med.generic_name, med.strength, med.schedule].filter(Boolean).join(" · ") || "No schedule details"}
                      </p>
                      {med.instructions && <p className="mt-3 text-sm text-foreground">{med.instructions}</p>}
                    </GlassCard>
                  ))
                )}

                <h2 className="pt-3 font-heading text-sm font-semibold text-muted-foreground">Recent Dose Logs</h2>
                {data.medDoses.slice(0, 8).map((dose) => (
                  <GlassCard key={dose.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{dose.medication_name || "Medication"}</p>
                        <p className="text-xs text-muted-foreground">
                          {dose.skipped ? "Skipped" : "Taken"} · {formatDateTime(dose.taken_time || dose.scheduled_time)}
                        </p>
                      </div>
                      <Badge variant="outline">{dose.logged_by_name || "Staff"}</Badge>
                    </div>
                    {dose.notes && <p className="mt-2 text-sm text-muted-foreground">{dose.notes}</p>}
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <GlassCard>
                <SectionHeader icon={ClipboardList} title="Create Task" subtitle="Keep staff work visible, owned, and moving." />
                <form className="mt-5 space-y-3" onSubmit={handleCreateTask}>
                  <Input value={taskForm.title} onChange={(event) => updateForm(setTaskForm, "title", event.target.value)} placeholder="Task title" />
                  <Textarea value={taskForm.description} onChange={(event) => updateForm(setTaskForm, "description", event.target.value)} placeholder="Task details" rows={4} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={taskForm.category} onChange={(event) => updateForm(setTaskForm, "category", event.target.value)} placeholder="Category" />
                    <Input type="datetime-local" value={taskForm.due_date} onChange={(event) => updateForm(setTaskForm, "due_date", event.target.value)} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select value={taskForm.priority} onValueChange={(value) => updateForm(setTaskForm, "priority", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={taskForm.status} onValueChange={(value) => updateForm(setTaskForm, "status", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input value={taskForm.link_url} onChange={(event) => updateForm(setTaskForm, "link_url", event.target.value)} placeholder="Reference URL" />
                  <Button type="submit" disabled={saving === "task"} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add Task
                  </Button>
                </form>
              </GlassCard>

              <div className="space-y-5">
                <TaskList title="Open Tasks" tasks={openTasks} saving={saving} onStatusChange={updateTaskStatus} />
                <TaskList title="Completed" tasks={completedTasks} saving={saving} onStatusChange={updateTaskStatus} compact />
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <GlassCard>
                <SectionHeader icon={UserCog} title="Change Display Name" subtitle="Mods can update usernames without touching roles or private profile fields." />
                <form className="mt-5 space-y-3" onSubmit={handleUpdateMemberName}>
                  <Select
                    value={memberForm.profile_id}
                    onValueChange={(value) => {
                      const selected = data.users.find((member) => member.id === value);
                      setMemberForm({
                        profile_id: value,
                        display_name: selected?.display_name || "",
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      {data.users.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.display_name || member.email || member.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={memberForm.display_name} onChange={(event) => updateForm(setMemberForm, "display_name", event.target.value)} placeholder="New display name" />
                  <Button type="submit" disabled={saving === "member" || !memberForm.profile_id} className="w-full gap-2">
                    <UserCog className="h-4 w-4" />
                    Update Name
                  </Button>
                </form>
              </GlassCard>

              <div className="space-y-3">
                {data.users.length === 0 ? (
                  <EmptyState title="No members found" />
                ) : (
                  data.users.map((member) => (
                    <GlassCard key={member.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-heading text-base font-semibold">{member.display_name || "Unnamed Member"}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{member.role || "user"}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMemberForm({ profile_id: member.id, display_name: member.display_name || "" })}
                        >
                          Edit Name
                        </Button>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function sortPlannerAssignments(a, b) {
  const dayA = STAFF_DAYS.findIndex((day) => day.key === a.day);
  const dayB = STAFF_DAYS.findIndex((day) => day.key === b.day);
  if (dayA !== dayB) return dayA - dayB;
  const blockA = SHIFT_PLANNER_BLOCKS.findIndex((block) => block.key === a.block);
  const blockB = SHIFT_PLANNER_BLOCKS.findIndex((block) => block.key === b.block);
  if (blockA !== blockB) return blockA - blockB;
  return Number(a.order || 0) - Number(b.order || 0);
}

function getInitials(name = "") {
  return String(name || "S")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";
}

function getAvailabilitySummary(availabilityDraft, day) {
  return Object.values(availabilityDraft?.[day] || {}).filter((status) => status === "free" || status === "on_call").length;
}

function isAvailableForBlock(assignment, availabilityRows, day, block) {
  const row = availabilityRows.find((entry) =>
    (assignment.profile_id && entry.profile_id === assignment.profile_id) || entry.staff_name === assignment.staff_name,
  );
  if (!row?.availability?.[day]) return false;
  return block.hours.some((hour) => ["free", "on_call"].includes(row.availability[day][hour]));
}

function AvailabilityManager({ availabilityDraft, onClearDay, onSave, onSelectMember, onSetDay, onToggleSlot, saving, selectedProfile, staffRoster }) {
  return (
    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader icon={CalendarClock} title="Availability Management" subtitle="Click slots to cycle Free, On Call, Busy, Do Not Disturb, then clear. Because time is real, apparently." />
        <Button type="button" onClick={onSave} disabled={saving || !selectedProfile} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Save Availability
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="text-sm font-semibold text-foreground" htmlFor="availability-member">Select team member:</label>
        <Select value={selectedProfile} onValueChange={onSelectMember}>
          <SelectTrigger id="availability-member" className="max-w-sm">
            <SelectValue placeholder="Choose staff" />
          </SelectTrigger>
          <SelectContent>
            {staffRoster.map((member) => (
              <SelectItem key={member.profile_id} value={member.profile_id}>{member.staff_name} - {member.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {AVAILABILITY_STATUSES.map((status) => (
          <span key={status.key} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${status.className.split(" ")[0]}`} />
            {status.label}
          </span>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {STAFF_DAYS.map((day) => (
          <div key={day.key} className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-semibold">{day.label}</h3>
                <Badge variant="outline">{getAvailabilitySummary(availabilityDraft, day.key)}h available</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABILITY_STATUSES.map((status) => (
                  <Button key={status.key} type="button" size="sm" variant="outline" onClick={() => onSetDay(day.key, status.key)}>
                    All {status.label}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="ghost" onClick={() => onClearDay(day.key)}>Clear</Button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
              {STAFF_HOURS.map((hour) => {
                const status = availabilityDraft?.[day.key]?.[hour];
                const statusMeta = AVAILABILITY_STATUS_MAP[status];
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onToggleSlot(day.key, hour)}
                    className={`h-10 rounded-full border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusMeta ? statusMeta.className : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
                    aria-label={`${day.label} ${hour}:00 ${statusMeta?.label || "unset"}`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function ShiftPlanner({ assignments, availabilityRows, onDragEnd, onRemove, onSave, saving, staffRoster }) {
  return (
    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader icon={ClipboardList} title="Shift Planner" subtitle="Drag staff from the pool into coverage cells. Green border means their availability matches that block." />
        <Button type="button" onClick={onSave} disabled={saving} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Save Shifts
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="pool" direction="horizontal" isDropDisabled={false}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="mt-5 rounded-lg border border-dashed border-border bg-secondary/20 p-3">
              <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Available members - drag to assign</p>
              <div className="flex min-h-12 flex-wrap gap-2">
                {staffRoster.map((member, index) => (
                  <Draggable key={member.profile_id} draggableId={`pool:${member.profile_id}`} index={index}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">{getInitials(member.staff_name)}</span>
                        {member.staff_name}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>

        <div className="mt-6 overflow-x-auto pb-2">
          <div className="grid min-w-[940px] grid-cols-[9rem_repeat(7,minmax(7rem,1fr))] gap-3">
            <div />
            {STAFF_DAYS.map((day) => <div key={day.key} className="text-center text-sm font-semibold text-muted-foreground">{day.label.slice(0, 3)}</div>)}
            {SHIFT_PLANNER_BLOCKS.map((block) => (
              <div key={block.key} className="contents">
                <div className="flex flex-col justify-center rounded-lg border border-border bg-secondary/20 p-3">
                  <span className="font-heading text-base font-semibold">{block.label}</span>
                  <span className="text-xs text-muted-foreground">{block.time}</span>
                </div>
                {STAFF_DAYS.map((day) => {
                  const cellAssignments = assignments
                    .filter((assignment) => assignment.day === day.key && assignment.block === block.key)
                    .sort(sortPlannerAssignments);
                  return (
                    <Droppable key={`${day.key}:${block.key}`} droppableId={`cell:${day.key}:${block.key}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-28 rounded-lg border bg-secondary/15 p-2 transition-colors ${snapshot.isDraggingOver ? "border-primary bg-primary/10" : "border-border"}`}
                        >
                          {cellAssignments.length === 0 && <p className="pt-8 text-center text-xs text-muted-foreground">Drop here</p>}
                          <div className="space-y-2">
                            {cellAssignments.map((assignment, index) => {
                              const key = assignment.local_id || assignment.id;
                              const available = isAvailableForBlock(assignment, availabilityRows, day.key, block);
                              return (
                                <Draggable key={key} draggableId={`assignment:${key}`} index={index}>
                                  {(dragProvided) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={`flex items-center gap-2 rounded-full border px-2 py-1.5 text-xs font-semibold shadow-sm ${available ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100" : "border-rose-400/40 bg-rose-500/10 text-rose-100"}`}
                                    >
                                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px]">{getInitials(assignment.staff_name)}</span>
                                      <span className="min-w-0 flex-1 truncate">{assignment.staff_name}</span>
                                      <button type="button" onClick={() => onRemove(key)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${assignment.staff_name}`}>
                                        x
                                      </button>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500/40 ring-1 ring-emerald-400/70" /> Available for block</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-rose-500/25 ring-1 ring-rose-400/40" /> No matching availability set</span>
        </div>
      </DragDropContext>
    </GlassCard>
  );
}

function OpsMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function StaffOpsNav({ activeTab, onTabChange, tabs }) {
  return (
    <nav className="mt-6 rounded-lg border border-white/10 bg-black/20 p-2 shadow-inner" aria-label="Staff Ops sections">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onTabChange(key)}
              className={`flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4546ff] ${
                active
                  ? "bg-[#4546ff] text-white shadow-[0_10px_28px_rgba(69,70,255,0.28)]"
                  : "bg-transparent text-muted-foreground hover:bg-white/10 hover:text-foreground"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/20" : "bg-white/10"}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function StaffDashboard({ activeUpdates, commandCount, data, onTabChange, openTasks, pendingTimeEntries, totalPayableHours, upcomingShifts }) {
  const metrics = [
    { label: "Open Tasks", value: openTasks.length, detail: "tiny fires currently labeled 'later'", icon: ClipboardList, tab: "tasks" },
    { label: "On Deck", value: upcomingShifts.length, detail: "scheduled or nearly scheduled coverage", icon: CalendarClock, tab: "schedule" },
    { label: "Updates", value: activeUpdates.length, detail: "ticker notes still breathing", icon: Bell, tab: "updates" },
    { label: "Payable Hours", value: totalPayableHours.toFixed(1), detail: `${pendingTimeEntries.length} unpaid or pending entries`, icon: Clock, tab: "time" },
  ];

  const recentTasks = openTasks.slice(0, 4);
  const recentUpdates = activeUpdates.slice(0, 3);
  const recentCommands = data.commands.slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} {...metric} onTabChange={onTabChange} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeader icon={Activity} title="Staff Cockpit" subtitle="Open work, live notes, and the next mod handoff in one place." />
            <Button variant="outline" size="sm" onClick={() => onTabChange("tasks")}>Open Tasks</Button>
          </div>
          <div className="mt-5 space-y-3">
            {recentTasks.length === 0 ? (
              <EmptyState title="No open staff tasks. Suspiciously peaceful." />
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-border bg-secondary/25 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-sm font-semibold">{task.title}</p>
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${statusTone(task.status)}`}>
                      {TASK_STATUS_LABELS[task.status] || "In Queue"}
                    </span>
                    <Badge variant="outline">{TASK_PRIORITY_LABELS[task.priority] || "Normal"}</Badge>
                  </div>
                  {task.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[task.category, task.due_date ? `due ${formatDateTime(task.due_date)}` : null].filter(Boolean).join(" - ") || "No category yet"}
                  </p>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeader icon={CalendarClock} title="Coverage Radar" subtitle="Who is supposed to be around when stream happens, allegedly." />
            <Button variant="outline" size="sm" onClick={() => onTabChange("schedule")}>Schedule</Button>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingShifts.length === 0 ? (
              <EmptyState title="No upcoming shifts. The schedule has entered witness protection." />
            ) : (
              upcomingShifts.map((shift) => (
                <div key={shift.id} className="rounded-lg border border-border bg-secondary/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-heading text-sm font-semibold">{shift.staff_name}</p>
                    <Badge variant="outline">{SHIFT_STATUS_LABELS[shift.status] || "Scheduled"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(shift.starts_at)} to {formatDateTime(shift.ends_at)}</p>
                  <p className="mt-2 text-sm text-foreground">{[shift.role, shift.stream_title].filter(Boolean).join(" - ") || "General coverage"}</p>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <GlassCard>
          <SectionHeader icon={Bell} title="Current Updates" subtitle="Dashboard ticker material, mood notes, and staff context." />
          <div className="mt-5 space-y-3">
            {recentUpdates.length === 0 ? (
              <EmptyState title="No active updates. Veri is either fine or merely unsupervised." />
            ) : (
              recentUpdates.map((update) => (
                <div key={update.id} className="rounded-lg border border-border bg-secondary/25 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-sm font-semibold">{update.title}</p>
                    <Badge variant="outline">{SCUFFOX_UPDATE_TONE_LABELS[update.tone] || "Announcement"}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{update.message}</p>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader icon={ExternalLink} title="Handy Links" subtitle="The stuff mods ask for while chat is actively becoming chat." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {STAFF_HANDY_LINKS.map((link) => (
              <HandyLinkCard key={link.label} link={link} />
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader icon={ClipboardList} title="Mod Hub Modules" subtitle="Pulled from ScuffOps' Team, Availability, Schedule, Handbook, and Shift Planner shape." />
          <Badge variant="outline">{commandCount} commands visible</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {STAFF_MODULE_SHORTCUTS.map((module) => (
            <ModuleShortcut key={module.label} module={module} onTabChange={onTabChange} />
          ))}
        </div>
        {recentCommands.length > 0 && (
          <div className="mt-5 rounded-lg border border-border bg-secondary/25 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-heading text-sm font-semibold">Recent Managed Commands</p>
              <Button variant="outline" size="sm" onClick={() => onTabChange("commands")}>Command Ref</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentCommands.map((command) => (
                <code key={command.id || command.command} className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-foreground">
                  {command.command}
                </code>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function MetricTile({ detail, icon: Icon, label, onTabChange, tab, value }) {
  return (
    <button
      type="button"
      onClick={() => onTabChange(tab)}
      className="rounded-lg border border-border bg-card/70 p-4 text-left shadow-sm transition-colors hover:border-primary/45 hover:bg-secondary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </button>
  );
}

function HandyLinkCard({ link }) {
  const Icon = link.icon;
  const classes = "group rounded-lg border border-border bg-secondary/25 p-3 transition-colors hover:border-primary/45 hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const content = (
    <>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span>{link.label}</span>
        {link.href && <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{link.description}</p>
    </>
  );

  if (link.href) {
    return <a className={classes} href={link.href} target="_blank" rel="noreferrer">{content}</a>;
  }

  return <Link className={classes} to={link.to}>{content}</Link>;
}

function ModuleShortcut({ module, onTabChange }) {
  const Icon = module.icon;
  return (
    <button
      type="button"
      onClick={() => onTabChange(module.tab)}
      className="rounded-lg border border-border bg-secondary/25 p-3 text-left transition-colors hover:border-primary/45 hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {module.label}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{module.description}</p>
    </button>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-primary/15 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ title }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}

function TaskList({ title, tasks, saving, onStatusChange, compact = false }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-muted-foreground">{title}</h2>
        <Badge variant="outline">{tasks.length}</Badge>
      </div>
      {tasks.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()}`} />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <GlassCard key={task.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-base font-semibold">{task.title}</h3>
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${statusTone(task.status)}`}>
                      {TASK_STATUS_LABELS[task.status] || "In Queue"}
                    </span>
                    <Badge variant="outline">{TASK_PRIORITY_LABELS[task.priority] || "Normal"}</Badge>
                  </div>
                  {!compact && task.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {task.category && <span>{task.category}</span>}
                    {task.due_date && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDateTime(task.due_date)}
                      </span>
                    )}
                    <span>by {task.created_by_name || "Staff"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {task.link_url && (
                    <a className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" href={task.link_url} target="_blank" rel="noreferrer">
                      Link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {task.status !== "working_on" && (
                    <Button size="sm" variant="outline" disabled={saving === task.id} onClick={() => onStatusChange(task, "working_on")}>
                      Start
                    </Button>
                  )}
                  {task.status !== "done" && (
                    <Button size="sm" disabled={saving === task.id} onClick={() => onStatusChange(task, "done")}>
                      Done
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </section>
  );
}
