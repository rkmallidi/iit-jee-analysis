import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";

import { login, me, meContext } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser, setContext } = useAuthStore();
  const { applyTheme } = useThemeStore();
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { data: tokens } = await login(data.username, data.password);
      setTokens(tokens.access_token, tokens.refresh_token);
      const [{ data: user }, { data: ctx }] = await Promise.all([me(), meContext()]);
      setUser(user);
      setContext(ctx.branch_ids);
      // Apply saved theme
      if (user.theme_prefs) {
        const { setMode, setPrimaryColor, setRadius } = useThemeStore.getState();
        if (user.theme_prefs.theme) setMode(user.theme_prefs.theme as "light" | "dark" | "system");
        if (user.theme_prefs.primaryColor) setPrimaryColor(user.theme_prefs.primaryColor as string);
        if (user.theme_prefs.radius) setRadius(user.theme_prefs.radius as string);
      }
      applyTheme();
      // Operators land directly on the OMR upload page
      const isOperator = user.roles.some(r => r.name === "Operator") &&
        !user.roles.some(r => ["Admin", "Dean", "Principal", "Vice-Principal"].includes(r.name));
      navigate(isOperator ? "/results" : "/");
    } catch {
      toast({ title: "Login failed", description: "Invalid username or password.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/10 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <GraduationCap className="h-9 w-9 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">IIT JEE Analysis</h1>
            <p className="text-sm text-muted-foreground mt-1">Academic Management Platform</p>
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
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
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
