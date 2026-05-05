import { format } from "date-fns";
import { Bell, CalendarPlus, Clock, Download, MapPin, Pencil } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CategoryBadge from "../CategoryBadge";
import UserMarkdown from "../UserMarkdown";
import { createGoogleCalendarUrl, downloadIcsFile, saveEventReminder } from "@/lib/calendarExport";

export default function EventDetailsPanel({ event, open, onOpenChange, canEdit = false, onEdit }) {
  if (!event) return null;

  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : start;

  const handleReminder = async () => {
    const reminder = saveEventReminder(event, 30);
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => {});
    }
    toast({
      title: "Reminder saved",
      description: `${reminder.title} will be remembered locally 30 minutes before start.`,
      duration: 3000,
    });
  };

  const handleGoogleCalendar = () => {
    window.open(createGoogleCalendarUrl(event).toString(), "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    downloadIcsFile(event);
    toast({ title: "Calendar file downloaded", duration: 3000 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={event.category} />
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {event.all_day
                ? format(start, "MMM d, yyyy")
                : `${format(start, "MMM d, h:mm a")} - ${format(end, "h:mm a")}`}
            </span>
          </div>

          {event.location && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {event.location}
            </p>
          )}

          {event.description ? (
            <UserMarkdown className="rounded-lg border border-border bg-secondary/35 p-3 text-sm text-muted-foreground">
              {event.description}
            </UserMarkdown>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              No extra details yet.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="gap-2" onClick={handleReminder}>
              <Bell className="h-4 w-4" />
              Remind me
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleGoogleCalendar}>
              <CalendarPlus className="h-4 w-4" />
              Google Calendar
            </Button>
            <Button variant="outline" className="gap-2 sm:col-span-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download .ics
            </Button>
          </div>

          {canEdit && (
            <Button className="w-full gap-2" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit event
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
