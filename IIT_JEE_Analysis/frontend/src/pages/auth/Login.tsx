import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

import { login, me, meContext } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useBrandStore } from "@/store/brand";
import { useThemeStore } from "@/store/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser, setContext } = useAuthStore();
  const { title, subtitle, logoUrl } = useBrandStore();
  const { applyTheme } = useThemeStore();
  const [showPwd, setShowPwd] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoginError(null);
      const { data: tokens } = await login(data.username, data.password);
      setTokens(tokens.access_token, tokens.refresh_token);
      const [{ data: user }, { data: ctx }] = await Promise.all([me(), meContext()]);
      setUser(user);
      setContext(ctx.branch_ids);
      if (user.theme_prefs) {
        const {
          setMode,
          setPrimaryColor,
          setRadius,
          setSidebarScheme,
          setSidebarColors,
          setSidebarFontSize,
          setAppFontFamily,
          setAppFontSize,
        } = useThemeStore.getState();
        if (user.theme_prefs.theme) setMode(user.theme_prefs.theme as "light" | "dark" | "system");
        if (user.theme_prefs.primaryColor) setPrimaryColor(user.theme_prefs.primaryColor as string);
        if (user.theme_prefs.radius) setRadius(user.theme_prefs.radius as string);
        if (user.theme_prefs.appFontFamily) setAppFontFamily(user.theme_prefs.appFontFamily as string);
        if (user.theme_prefs.appFontSize) setAppFontSize(user.theme_prefs.appFontSize as string);
        if (user.theme_prefs.sidebarBackground) {
          setSidebarScheme({
            background: user.theme_prefs.sidebarBackground as string,
            foreground: (user.theme_prefs.sidebarForeground as string) || "210 40% 98%",
            muted: (user.theme_prefs.sidebarMuted as string) || "215 20% 67%",
            border: (user.theme_prefs.sidebarBorder as string) || (user.theme_prefs.sidebarAccent as string) || "217 33% 17%",
            hover: (user.theme_prefs.sidebarHover as string) || (user.theme_prefs.sidebarAccent as string) || "217 33% 17%",
            hoverForeground: (user.theme_prefs.sidebarHoverForeground as string) || (user.theme_prefs.sidebarForeground as string) || "210 40% 98%",
            active: (user.theme_prefs.sidebarActive as string) || (user.theme_prefs.sidebarAccent as string) || "221 83% 23%",
            activeForeground: (user.theme_prefs.sidebarActiveForeground as string) || (user.theme_prefs.sidebarForeground as string) || "210 40% 98%",
          });
        }
        setSidebarColors({
          ...(user.theme_prefs.sidebarMuted ? { muted: user.theme_prefs.sidebarMuted as string } : {}),
          ...(user.theme_prefs.sidebarBorder ? { border: user.theme_prefs.sidebarBorder as string } : {}),
          ...(user.theme_prefs.sidebarHover ? { hover: user.theme_prefs.sidebarHover as string } : {}),
          ...(user.theme_prefs.sidebarHoverForeground ? { hoverForeground: user.theme_prefs.sidebarHoverForeground as string } : {}),
          ...(user.theme_prefs.sidebarActive ? { active: user.theme_prefs.sidebarActive as string } : {}),
          ...(user.theme_prefs.sidebarActiveForeground ? { activeForeground: user.theme_prefs.sidebarActiveForeground as string } : {}),
        });
        if (user.theme_prefs.sidebarFontSize) setSidebarFontSize(user.theme_prefs.sidebarFontSize as string);
      }
      applyTheme();
      const isOperator = user.roles.some((r: { name: string }) => r.name === "Operator") &&
                         !user.roles.some((r: { name: string }) => ["Admin", "Dean", "Principal", "Vice-Principal"].includes(r.name));
      navigate(isOperator ? "/results" : "/");
    } catch {
      setLoginError("Invalid username or password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/10 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-lg ring-1 ring-border/50">
            <img src={logoUrl} alt={title} className="h-full w-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl tracking-wide" style={{ fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" }}>
              {title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle} - IIT JEE Analysis Platform</p>
          </div>
        </div>

        {/* Card */}
        <Card className="shadow-xl border-0 ring-1 ring-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Sign in with your username and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  {...register("username")}
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register("password")}
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    tabIndex={-1}
                    className="border-0 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {loginError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Login failed</p>
                    <p className="text-xs">{loginError}</p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Contact your administrator if you can't log in.
        </p>
      </div>
    </div>
  );
}
