import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import BirthdaySubmitForm from "../components/birthdays/BirthdaySubmitForm";
import BirthdayList from "../components/birthdays/BirthdayList";
import { useToast } from "@/components/ui/use-toast";

export default function Birthdays() {
  const { toast } = useToast();
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("approved");

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
    } catch {}
    const all = await base44.entities.Birthday.list("-created_date", 200);
    setBirthdays(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";

  const handleApprove = async (id) => {
    await base44.entities.Birthday.update(id, { status: "approved" });
    toast({ title: "Birthday approved!" });
    loadData();
  };

  const handleReject = async (id) => {
    await base44.entities.Birthday.update(id, { status: "rejected" });
    toast({ title: "Birthday rejected" });
    loadData();
  };

  const filteredBirthdays = birthdays.filter((b) => {
    if (tab === "pending") return b.status === "pending";
    if (tab === "approved") return b.status === "approved";
    return true;
  });

  const pendingCount = birthdays.filter((b) => b.status === "pending").length;

  const tabs = [
    { key: "approved", label: "Approved" },
    ...(isAdmin ? [{ key: "pending", label: `Pending (${pendingCount})` }] : []),
    { key: "all", label: "All" },
  ];

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Birthdays</h1>
        <p className="mt-1 text-sm text-muted-foreground">Submit and celebrate community birthdays</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <BirthdaySubmitForm onSubmitted={loadData} />
        </div>
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="mb-4 flex rounded-lg border border-border bg-secondary/50 p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : (
            <BirthdayList
              birthdays={filteredBirthdays}
              isAdmin={isAdmin}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </div>
      </div>
    </div>
  );
}