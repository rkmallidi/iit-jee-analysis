import { useThemeStore, APP_FONTS, PRESET_COLORS, SIDEBAR_SCHEMES, type ThemeMode } from "@/store/theme";
import { useAuthStore } from "@/store/auth";
import { useBrandStore } from "@/store/brand";
import { updateMyTheme } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const SIDEBAR_FONT_SIZES = [
  { label: "Small", value: "12px" },
  { label: "Medium", value: "13px" },
  { label: "Large", value: "14px" },
  { label: "XL", value: "15px" },
];

const APP_FONT_SIZES = [
  { label: "Compact", value: "13px" },
  { label: "Standard", value: "14px" },
  { label: "Comfort", value: "15px" },
  { label: "Large", value: "16px" },
];

const SIDEBAR_COLOR_FIELDS = [
  { label: "Background", key: "background" as const },
  { label: "Main Text", key: "foreground" as const },
  { label: "Muted Text", key: "muted" as const },
  { label: "Border", key: "border" as const },
  { label: "Hover Bg", key: "hover" as const },
  { label: "Hover Text", key: "hoverForeground" as const },
  { label: "Active Bg", key: "active" as const },
  { label: "Active Text", key: "activeForeground" as const },
];

export default function SettingsPage() {
  const { mode, primaryColor, radius, setMode, setPrimaryColor, setRadius } = useThemeStore();
  const {
    appFontFamily,
    appFontSize,
    sidebarBackground,
    sidebarForeground,
    sidebarMuted,
    sidebarBorder,
    sidebarHover,
    sidebarHoverForeground,
    sidebarActive,
    sidebarActiveForeground,
    sidebarFontSize,
    setSidebarScheme,
    setSidebarColors,
    setSidebarFontSize,
    setAppFontFamily,
    setAppFontSize,
  } = useThemeStore();
  const { user, setUser, isAdmin } = useAuthStore();
  const { title, subtitle, logoUrl, setBrand, resetBrand } = useBrandStore();
  const sidebarColorValues = {
    background: sidebarBackground,
    foreground: sidebarForeground,
    muted: sidebarMuted,
    border: sidebarBorder,
    hover: sidebarHover,
    hoverForeground: sidebarHoverForeground,
    active: sidebarActive,
    activeForeground: sidebarActiveForeground,
  };

  const saveTheme = async () => {
    try {
      const { data } = await updateMyTheme({
        theme: mode,
        primaryColor,
        radius,
        appFontFamily,
        appFontSize,
        sidebarBackground,
        sidebarForeground,
        sidebarMuted,
        sidebarBorder,
        sidebarHover,
        sidebarHoverForeground,
        sidebarActive,
        sidebarActiveForeground,
        sidebarFontSize,
      });
      setUser(data);
      toast({ title: "Theme saved", description: "Your preferences have been saved to your account." });
    } catch {
      toast({ title: "Error saving theme", variant: "destructive" });
    }
  };

  const handleLogoFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBrand(title, subtitle, String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const updateSidebarColor = (key: keyof typeof sidebarColorValues, value: string) => {
    setSidebarColors({ [key]: value } as Partial<typeof sidebarColorValues>);
  };

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">Branding, appearance, and account preferences.</p>
        </div>
        <Button onClick={saveTheme}>Save Appearance</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {isAdmin() && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Branding</CardTitle>
                <CardDescription>Shown in the sidebar and login screen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-3 text-xs font-medium text-muted-foreground">Preview</p>
                    <div className="flex items-center gap-3 rounded-md bg-slate-950 px-3 py-3 text-white">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                        <img src={logoUrl} alt={title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xl tracking-wide" style={{ fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" }}>
                          {title}
                        </p>
                        <p className="truncate text-[10px] uppercase tracking-widest text-white/45">{subtitle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="brand-title">Brand Text</Label>
                        <Input
                          id="brand-title"
                          value={title}
                          onChange={e => setBrand(e.target.value, subtitle, logoUrl)}
                          placeholder="Sri Chaitanya"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="brand-subtitle">Subtitle</Label>
                        <Input
                          id="brand-subtitle"
                          value={subtitle}
                          onChange={e => setBrand(title, e.target.value, logoUrl)}
                          placeholder="Kavuri Hills"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[80px_minmax(0,1fr)]">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-white">
                        <img src={logoUrl} alt={title} className="h-full w-full object-cover" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="brand-logo-url">Logo URL</Label>
                          <Input
                            id="brand-logo-url"
                            value={logoUrl}
                            onChange={e => setBrand(title, subtitle, e.target.value)}
                            placeholder="/sc-logo.png.jpeg"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="brand-logo-file">Upload Logo</Label>
                          <Input
                            id="brand-logo-file"
                            type="file"
                            accept="image/*"
                            onChange={e => handleLogoFile(e.target.files?.[0])}
                          />
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" onClick={resetBrand}>Reset Branding</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Theme, colour, and interface density.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-medium">Colour Mode</p>
                  <p className="text-xs text-muted-foreground">Display theme</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {THEMES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className={`flex h-20 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-all ${
                        mode === id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 border-t pt-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-medium">Primary Colour</p>
                  <p className="text-xs text-muted-foreground">Accent colour</p>
                </div>
                <div className="flex flex-wrap gap-3">
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
              </section>

              <section className="grid gap-3 border-t pt-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-medium">Application Font</p>
                  <p className="text-xs text-muted-foreground">Main UI typography</p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/20 px-4 py-3" style={{ fontFamily: appFontFamily, fontSize: appFontSize }}>
                    <p className="font-semibold">Sri Chaitanya IIT JEE Analysis</p>
                    <p className="mt-1 text-muted-foreground">Dashboard, tables, forms, and reports use this font.</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {APP_FONTS.map((font) => (
                      <button
                        key={font.name}
                        onClick={() => setAppFontFamily(font.value)}
                        className={`rounded-md border px-3 py-2 text-left transition-all ${
                          appFontFamily === font.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40"
                        }`}
                        style={{ fontFamily: font.value }}
                      >
                        <span className="block text-sm font-semibold">{font.name}</span>
                        <span className="block text-xs text-muted-foreground">Aa Bb 123</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {APP_FONT_SIZES.map((size) => (
                      <button
                        key={size.value}
                        onClick={() => setAppFontSize(size.value)}
                        className={`px-4 py-1.5 text-sm font-medium border rounded-md transition-all ${
                          appFontSize === size.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 border-t pt-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-medium">Sidebar Scheme</p>
                  <p className="text-xs text-muted-foreground">Menu colour set</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {SIDEBAR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.name}
                      onClick={() => setSidebarScheme(scheme)}
                      className={`flex h-16 items-center gap-3 rounded-md border px-3 text-left transition-all ${
                        sidebarBackground === scheme.background
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-md border" style={{ borderColor: `hsl(${scheme.border})` }}>
                        <span className="h-full flex-1" style={{ background: `hsl(${scheme.background})` }} />
                        <span className="h-full w-3" style={{ background: `hsl(${scheme.active})` }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{scheme.name}</span>
                        <span className="block text-xs text-muted-foreground">Sidebar</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 border-t pt-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-medium">Sidebar Colours</p>
                  <p className="text-xs text-muted-foreground">Use HSL values</p>
                </div>
                <div className="space-y-4">
                  <div
                    className="rounded-md border p-3"
                    style={{
                      background: `hsl(${sidebarBackground})`,
                      color: `hsl(${sidebarForeground})`,
                      borderColor: `hsl(${sidebarBorder})`,
                    }}
                  >
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: `hsl(${sidebarMuted})` }}>
                      Preview
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md px-3 py-2 text-sm" style={{ background: `hsl(${sidebarActive})`, color: `hsl(${sidebarActiveForeground})` }}>
                        Active menu
                      </div>
                      <div className="rounded-md px-3 py-2 text-sm" style={{ background: `hsl(${sidebarHover})`, color: `hsl(${sidebarHoverForeground})` }}>
                        Hover menu
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {SIDEBAR_COLOR_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={`sidebar-${field.key}`} className="text-xs">{field.label}</Label>
                        <Input
                          id={`sidebar-${field.key}`}
                          value={sidebarColorValues[field.key]}
                          onChange={e => updateSidebarColor(field.key, e.target.value)}
                          placeholder="222 47% 11%"
                          className="font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 border-t pt-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-medium">Sidebar Font</p>
                  <p className="text-xs text-muted-foreground">Menu text size</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SIDEBAR_FONT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setSidebarFontSize(size.value)}
                      className={`px-4 py-1.5 text-sm font-medium border rounded-md transition-all ${
                        sidebarFontSize === size.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 border-t pt-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-medium">Border Radius</p>
                  <p className="text-xs text-muted-foreground">Corner style</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRadius(r.value)}
                      className={`px-4 py-1.5 text-sm font-medium border rounded-md transition-all ${
                        radius === r.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-5">
          <CardHeader className="pb-3">
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed-in profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[
                { label: "Full Name", value: user?.full_name },
                { label: "Username", value: user?.username },
                { label: "Email", value: user?.email || "-" },
                { label: "Phone", value: user?.phone || "-" },
                { label: "WhatsApp", value: user?.whatsapp || "-" },
                { label: "Roles", value: user?.roles.map(r => r.name).join(", ") },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-0.5 border-b pb-3 last:border-0 last:pb-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
