import { ArrowLeft, Bell, BookOpen, Info, Mail, Shield, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";

const KEYS = {
  liveClassAlerts: "sc_settings_live_alerts",
  homeworkReminders: "sc_settings_homework_reminders",
  testReminders: "sc_settings_test_reminders",
  studyDigest: "sc_settings_study_digest",
} as const;

function loadBool(key: string, defaultValue: boolean) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultValue;
    return v === "1";
  } catch {
    return defaultValue;
  }
}

function saveBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [liveClassAlerts, setLiveClassAlerts] = useState(() => loadBool(KEYS.liveClassAlerts, true));
  const [homeworkReminders, setHomeworkReminders] = useState(() => loadBool(KEYS.homeworkReminders, true));
  const [testReminders, setTestReminders] = useState(() => loadBool(KEYS.testReminders, true));
  const [studyDigest, setStudyDigest] = useState(() => loadBool(KEYS.studyDigest, false));

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    };
    void load();
  }, []);

  const setLive = useCallback((v: boolean) => {
    setLiveClassAlerts(v);
    saveBool(KEYS.liveClassAlerts, v);
  }, []);
  const setHw = useCallback((v: boolean) => {
    setHomeworkReminders(v);
    saveBool(KEYS.homeworkReminders, v);
  }, []);
  const setTest = useCallback((v: boolean) => {
    setTestReminders(v);
    saveBool(KEYS.testReminders, v);
  }, []);
  const setDigest = useCallback((v: boolean) => {
    setStudyDigest(v);
    saveBool(KEYS.studyDigest, v);
  }, []);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-primary text-primary-foreground">
        <div className="flex items-center gap-1 px-2 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="text-lg font-bold tracking-tight">Settings</h1>
            <p className="text-xs text-primary-foreground/75 font-medium">SAHGAL CLASSES — Student app</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-8">
        {/* Account */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3 px-0.5">
            Account
          </h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Mail size={20} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signed in as</p>
                <p className="text-sm font-semibold text-foreground mt-0.5 break-all">
                  {email ?? "—"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Account security is managed by your email login. Contact support if you need to update your email.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3 px-0.5 flex items-center gap-2">
            <Bell size={14} className="text-primary" />
            Notifications
          </h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm divide-y divide-border">
            <SettingRow
              icon={<Smartphone size={18} className="text-primary" />}
              title="Live class alerts"
              description="Reminders when a live session is about to start."
              checked={liveClassAlerts}
              onCheckedChange={setLive}
            />
            <SettingRow
              icon={<BookOpen size={18} className="text-primary" />}
              title="Homework reminders"
              description="Gentle nudges for pending assignments."
              checked={homeworkReminders}
              onCheckedChange={setHw}
            />
            <SettingRow
              icon={<Bell size={18} className="text-primary" />}
              title="Test & quiz reminders"
              description="Alerts before scheduled tests in the portal."
              checked={testReminders}
              onCheckedChange={setTest}
            />
            <SettingRow
              icon={<Info size={18} className="text-primary" />}
              title="Weekly study digest"
              description="Summary of your progress (optional)."
              checked={studyDigest}
              onCheckedChange={setDigest}
              isLast
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 px-0.5 leading-relaxed">
            Preferences are saved on this device. Push notifications require your browser or OS to allow them when we enable them in a future update.
          </p>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3 px-0.5 flex items-center gap-2">
            <Shield size={14} className="text-primary" />
            Privacy & data
          </h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
            <p className="text-sm text-foreground leading-relaxed">
              Your learning activity is used only to improve your experience and to help teachers support you. We do not sell personal data.
            </p>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              For full terms and privacy details, contact{" "}
              <a href="mailto:sahgalclasses@gmail.com" className="font-semibold text-primary hover:underline">
                sahgalclasses@gmail.com
              </a>
              .
            </p>
          </div>
        </section>

        {/* App */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3 px-0.5">
            App
          </h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Version</span>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">1.0.0</span>
          </div>
        </section>
      </div>
    </div>
  );
};

function SettingRow({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  );
}

export default SettingsPage;
