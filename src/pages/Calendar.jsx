import { useMemo, useState, useEffect } from "react";
import { communityClient } from "@/api/communityClient";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, List, Grid3X3, Kanban, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonthView from "../components/calendar/MonthView";
import BoardView from "../components/calendar/BoardView";
import ListView from "../components/calendar/ListView";
import EventFormDialog from "../components/calendar/EventFormDialog";
import EventDetailsPanel from "../components/calendar/EventDetailsPanel";
import { EVENT_CATEGORY_OPTIONS, getCategoryColor } from "@/lib/categoryColors";
import { canModerate } from "@/lib/roles";

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCollabBooking, setShowCollabBooking] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try { const me = await communityClient.auth.me(); setUser(me); } catch {}
    try {
      const [all, approvedBirthdays] = await Promise.all([
        communityClient.entities.Event.filter({ status: "active" }).catch(() => []),
        communityClient.entities.Birthday.filter({ status: "approved" }, "-created_date", 500).catch(() => []),
      ]);
      setEvents(Array.isArray(all) ? all : []);
      setBirthdays(Array.isArray(approvedBirthdays) ? approvedBirthdays : []);
    } catch {
      setEvents([]);
      setBirthdays([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, []);

  const isMod = canModerate(user);

  const calendarItems = useMemo(() => {
    const year = currentDate.getFullYear();
    const yearsToRender = [year - 1, year, year + 1];
    const birthdayEvents = birthdays.flatMap((birthday) => {
      if (!birthday.birthday_date) return [];
      const [, month, day] = birthday.birthday_date.match(/(\d{2})-(\d{2})$/) || [];
      if (!month || !day) return [];

      return yearsToRender.map((targetYear) => {
        const start = new Date(targetYear, Number(month) - 1, Number(day), 12, 0, 0);
        if (start.getMonth() !== Number(month) - 1 || start.getDate() !== Number(day)) return null;

        return {
          id: `birthday-${birthday.id}-${targetYear}`,
          source_id: birthday.id,
          source_type: "birthday",
          title: `${birthday.display_name || "Community member"}'s Birthday`,
          description: birthday.note || "Community birthday",
          category: "birthdays",
          start_date: start.toISOString(),
          end_date: start.toISOString(),
          all_day: true,
          status: "active",
          is_birthday: true,
        };
      }).filter(Boolean);
    });

    return [...events, ...birthdayEvents];
  }, [birthdays, currentDate, events]);

  const filteredEvents = filterCategory === "all"
    ? calendarItems
    : calendarItems.filter((e) => e.category === filterCategory);

  const handlePrev = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNext = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleEventClick = (ev) => {
    setSelectedEvent(ev);
    setShowDetails(true);
  };
  const handleDateClick = (day, dayEvents = []) => {
    if (dayEvents.length > 0) {
      setSelectedEvent(dayEvents[0]);
      setShowDetails(true);
      return;
    }
    if (!isMod) return;
    setEditingEvent(null);
    setShowForm(true);
  };
  const handleEditSelected = () => {
    if (!selectedEvent || selectedEvent.is_birthday) return;
    setEditingEvent(selectedEvent);
    setShowDetails(false);
    setShowForm(true);
  };
  const handleSaved = () => {
    setEditingEvent(null);
    loadEvents();
  };

  const handleDelete = async () => {
    if (editingEvent) {
      await communityClient.entities.Event.delete(editingEvent.id);
      setShowForm(false);
      setEditingEvent(null);
      loadEvents();
    }
  };

  const viewButtons = [
    { key: "month", icon: Grid3X3, label: "Month" },
    { key: "board", icon: Kanban, label: "Board" },
    { key: "list", icon: List, label: "List" },
  ];

  const categories = [
    { key: "all", label: "All" },
    ...EVENT_CATEGORY_OPTIONS,
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your events and schedule</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCollabBooking(!showCollabBooking)} className="gap-2">
            <Users className="h-4 w-4" /> {showCollabBooking ? "Hide Booking" : "Book a Collab"}
          </Button>
          {isMod && (
            <Button onClick={() => { setEditingEvent(null); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> New Event
            </Button>
          )}
        </div>
      </div>

      {/* Collab Booking Embed */}
      {showCollabBooking && (
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-heading text-sm font-semibold">Book a Collab Slot</span>
            <span className="ml-auto text-xs text-muted-foreground">Powered by Google Calendar</span>
          </div>
          <iframe
            src="https://calendar.app.google/QhFmUCXPxe7FZKEy9"
            className="w-full"
            style={{ height: "600px", border: "none", filter: "invert(1) hue-rotate(180deg) sepia(0.15) brightness(0.88)" }}
            title="Collab Availability Booking"
          />
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 font-heading text-lg font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <div className="flex flex-wrap rounded-lg border border-border bg-secondary/50 p-0.5">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilterCategory(c.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterCategory === c.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                style={filterCategory === c.key && c.key !== "all" ? {
                  background: getCategoryColor(c.key).hex,
                  color: c.key === "birthdays" ? "#06121a" : "#ffffff",
                } : undefined}
              >
                {c.label}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
            {viewButtons.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`rounded-md p-1.5 transition-colors ${
                  view === v.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <v.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <>
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === "board" && (
            <BoardView events={filteredEvents} onEventClick={handleEventClick} />
          )}
          {view === "list" && (
            <ListView events={filteredEvents} onEventClick={handleEventClick} />
          )}
        </>
      )}

      {/* Event Form Dialog */}
      {showForm && (
        <EventFormDialog
          open={showForm}
          onOpenChange={(v) => { if (!v) { setShowForm(false); setEditingEvent(null); } }}
          event={editingEvent}
          onSaved={handleSaved}
        />
      )}
      <EventDetailsPanel
        event={selectedEvent}
        open={showDetails}
        onOpenChange={(v) => { setShowDetails(v); if (!v) setSelectedEvent(null); }}
        canEdit={isMod && !selectedEvent?.is_birthday}
        onEdit={handleEditSelected}
      />
    </div>
  );
}
