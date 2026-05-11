import { useThemeStore, PRESET_COLORS, type ThemeMode } from "@/store/theme";
import { useAuthStore } from "@/store/auth";
import { updateMyTheme } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Monitor, Moon, Sun, Check } from "lucide-react";

const THEMES: { id: ThemeMode; label: string; icon: React.ElementType }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const RADIUS_OPTIONS = [
  { label: "None", value: "0rem" },
  { label: "Small", value: "0.25rem" },
  { label: "Medium", value: "0.5rem" },
  { label: "Large", value: "0.75rem" },
  { label: "Full", value: "1rem" },
];

export default function SettingsPage() {
  const { mode, primaryColor, radius, setMode, setPrimaryColor, setRadius } = useThemeStore();
  const { user, setUser } = useAuthStore();

  const saveTheme = async () => {
    try {
      const { data } = await updateMyTheme({ theme: mode, primaryColor, radius });
      setUser(data);
      toast({ title: "Theme saved", description: "Your preferences have been saved to your account." });
    } catch {
      toast({ title: "Error saving theme", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Customize your experience. Changes apply immediately and can be saved to your account.</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your colour mode preference.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode */}
          <div>
            <p className="text-sm font-medium mb-3">Colour Mode</p>
            <div className="flex gap-3">
              {THEMES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-4 text-sm font-medium transition-all ${
                    mode === id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Primary colour */}
          <div>
            <p className="text-sm font-medium mb-3">Primary Colour</p>
            <div className="flex gap-3 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setPrimaryColor(c.value)}
                  title={c.name}
                  className={`relative h-9 w-9 rounded-full transition-all ring-offset-2 ring-offset-background ${
                    primaryColor === c.value ? "ring-2 ring-primary scale-110" : "hover:scale-105"
                  }`}
                  style={{ background: `hsl(${c.value})` }}
                >
                  {primaryColor === c.value && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Border radius */}
          <div>
            <p className="text-sm font-medium mb-3">Border Radius</p>
            <div className="flex gap-2 flex-wrap">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRadius(r.value)}
                  className={`px-4 py-1.5 text-sm font-medium border rounded-lg transition-all ${
                    radius === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <Button onClick={saveTheme}>Save Theme to Account</Button>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {[
              { label: "Full Name", value: user?.full_name },
              { label: "Username", value: user?.username },
              { label: "Email", value: user?.email },
              { label: "Phone", value: user?.phone || "—" },
              { label: "WhatsApp", value: user?.whatsapp || "—" },
              { label: "Roles", value: user?.roles.map(r => r.name).join(", ") },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
