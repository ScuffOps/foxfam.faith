import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, List, Grid3X3, Kanban, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonthView from "../components/calendar/MonthView";
import BoardView from "../components/calendar/BoardView";
import ListView from "../components/calendar/ListView";
import EventFormDialog from "../components/calendar/EventFormDialog";

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCollabBooking, setShowCollabBooking] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try { const me = await base44.auth.me(); setUser(me); } catch {}
    const all = await base44.entities.Event.filter({ status: "active" });
    setEvents(all);
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, []);

  const isMod = user?.role === "mod" || user?.role === "admin";

  const filteredEvents = filterCategory === "all"
    ? events
    : events.filter((e) => e.category === filterCategory);

  const handlePrev = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNext = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleEventClick = (ev) => {
    if (!isMod) return;
    setEditingEvent(ev);
    setShowForm(true);
  };
  const handleDateClick = (day) => {
    if (!isMod) return;
    setEditingEvent(null);
    setShowForm(true);
  };
  const handleSaved = () => {
    setEditingEvent(null);
    loadEvents();
  };

  const handleDelete = async () => {
    if (editingEvent) {
      await base44.entities.Event.delete(editingEvent.id);
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
    { key: "personal", label: "Personal" },
    { key: "community", label: "Community" },
    { key: "collabs", label: "Collabs" },
    { key: "birthdays", label: "Birthdays" },
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
        <div className="flex items-center gap-2">
          {/* Category filter */}
          <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilterCategory(c.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterCategory === c.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
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
    </div>
  );
}