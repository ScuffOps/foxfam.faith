import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  ClipboardList,
  ExternalLink,
  Pill,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  Trash2,
  UserCog,
} from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import GlassCard from "../components/GlassCard";
import { canModerate } from "@/lib/roles";
import { DEFAULT_COMMAND_REFERENCE, STAFF_HANDBOOK_SECTIONS } from "@/lib/staffHandbook";
import { getPublicDisplayName } from "@/lib/userIdentity";
import {
  COMMAND_SOURCE_LABELS,
  SHIFT_STATUS_LABELS,
  STREAM_RATING_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TIME_ENTRY_STATUS_LABELS,
  getTimeEntryHours,
  getValidationMessage,
  isOpenTask,
  parseBotCommandForm,
  parseMedicationDoseForm,
  parseMedicationForm,
  parseModShiftForm,
  parseStaffTaskForm,
  parseStaffTimeEntryForm,
  parseStreamLogForm,
} from "@/lib/staffOps";

const TABS = [
  { key: "handbook", label: "Handbook", icon: BookOpen },
  { key: "commands", label: "Commands", icon: Bot },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
  { key: "time", label: "Time Tracker", icon: Clock },
  { key: "streams", label: "Stream Logs", icon: Radio },
  { key: "meds", label: "Medication", icon: Pill },
  { key: "tasks", label: "Tasklist", icon: ClipboardList },
  { key: "members", label: "Members", icon: UserCog },
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

function sortNewest(items) {
  return [...items].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
}

function statusTone(status) {
  if (status === "done") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
  if (status === "blocked") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "working_on") return "border-primary/40 bg-primary/10 text-primary";
  return "border-border bg-secondary/60 text-muted-foreground";
}

export default function StaffOps({ defaultTab = "handbook" }) {
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
    shifts: [],
    timeEntries: [],
    commands: [],
    users: [],
  });
  const [streamForm, setStreamForm] = useState(DEFAULT_STREAM_FORM);
  const [medForm, setMedForm] = useState(DEFAULT_MED_FORM);
  const [doseForm, setDoseForm] = useState(DEFAULT_DOSE_FORM);
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM);
  const [shiftForm, setShiftForm] = useState(DEFAULT_SHIFT_FORM);
  const [timeForm, setTimeForm] = useState(DEFAULT_TIME_FORM);
  const [commandForm, setCommandForm] = useState(DEFAULT_COMMAND_FORM);
  const [memberForm, setMemberForm] = useState(DEFAULT_MEMBER_FORM);

  const isStaff = canModerate(user);
  const staffName = getPublicDisplayName(user, "Staff");

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
          shifts: [],
          timeEntries: [],
          commands: [],
          users: [],
        });
        return;
      }

      const [streamLogs, medications, medDoses, tasks, shifts, timeEntries, commands, users] = await Promise.all([
        communityClient.entities.StreamLog.list("-created_date", 100),
        communityClient.entities.Medication.list("-created_date", 100),
        communityClient.entities.MedDose.list("-created_date", 100),
        communityClient.entities.StaffTask.list("-created_date", 200),
        communityClient.entities.ModShift.list("-created_date", 200).catch(() => []),
        communityClient.entities.StaffTimeEntry.list("-created_date", 200).catch(() => []),
        communityClient.entities.BotCommand.list("-created_date", 500).catch(() => []),
        communityClient.entities.User.list().catch(() => []),
      ]);
      setData({
        streamLogs: sortNewest(streamLogs),
        medications: sortNewest(medications),
        medDoses: sortNewest(medDoses),
        tasks: sortNewest(tasks),
        shifts: sortNewest(shifts),
        timeEntries: sortNewest(timeEntries),
        commands: sortNewest(commands),
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

  const openTasks = useMemo(() => data.tasks.filter(isOpenTask), [data.tasks]);
  const completedTasks = useMemo(() => data.tasks.filter((task) => task.status === "done"), [data.tasks]);
  const totalPayableHours = useMemo(
    () => data.timeEntries.filter((entry) => entry.payable).reduce((sum, entry) => sum + getTimeEntryHours(entry), 0),
    [data.timeEntries],
  );
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

  function updateForm(setter, key, value) {
    setter((current) => ({ ...current, [key]: value }));
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

  if (!loading && !isStaff) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ShieldAlert className="mb-3 h-10 w-10 text-destructive" />
        <h2 className="font-heading text-lg font-semibold">Access Denied</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Staff handbook, schedules, time tracking, command references, and private ops are available to mods, lead mods, and admins only.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Staff Ops</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mod onboarding, command references, scheduling, time tracking, and private stream support.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/35 px-3 py-2 text-xs text-muted-foreground">
          <Activity className="h-4 w-4 text-primary" />
          <span>{openTasks.length} open tasks</span>
          <span>·</span>
          <span>{data.shifts.length} shifts</span>
          <span>·</span>
          <span>{totalPayableHours.toFixed(1)} payable hrs</span>
          <span>·</span>
          <span>{data.streamLogs.length} stream logs</span>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <>
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
          )}

          {activeTab === "time" && (
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <GlassCard>
                <SectionHeader icon={Clock} title="Track Paid Hours" subtitle="For staff like Grimmie, Keira, and anyone else being paid for support." />
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

              <div className="space-y-3">
                <GlassCard>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Payable total</p>
                    <p className="font-heading text-xl font-semibold text-primary">{totalPayableHours.toFixed(1)} hours</p>
                  </div>
                </GlassCard>
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
