import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { LibrarySystem, type Role, type User } from "@/lib/library";
import { BookMarked, GraduationCap, Shield, Sparkles, Mail, Lock, User as UserIcon } from "lucide-react";

export function AuthPage({
  lib,
  onAuth,
}: {
  lib: LibrarySystem;
  onAuth: (u: User) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login state
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regPw2, setRegPw2] = useState("");
  const [regRole, setRegRole] = useState<Role>("student");
  const [regLoading, setRegLoading] = useState(false);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const r = await lib.login(loginId, loginPw);
    setLoginLoading(false);
    if (!r.ok || !r.user) {
      toast({ title: "Login failed", description: r.reason, variant: "destructive" });
      return;
    }
    toast({ title: `Welcome back, ${r.user.username}!` });
    onAuth(r.user);
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPw !== regPw2) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setRegLoading(true);
    const r = await lib.register(regUser, regEmail, regPw, regRole);
    setRegLoading(false);
    if (!r.ok || !r.user) {
      toast({ title: "Registration failed", description: r.reason, variant: "destructive" });
      return;
    }
    toast({ title: "Account created", description: `Welcome, ${r.user.username}!` });
    onAuth(r.user);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 gradient-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-pink-500/10 to-cyan-400/20 pointer-events-none" />
      <div className="grid w-full max-w-5xl grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col gap-6 text-white p-8">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
              <BookMarked className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Smart Library</h1>
              <p className="text-white/80 text-sm">Powered by ADSA · Trie · Heap · Stack</p>
            </div>
          </div>
          <div className="space-y-4 mt-6">
            <FeatureRow icon={<Sparkles className="h-5 w-5" />} title="Lightning-fast prefix search" desc="Trie-powered title lookup as you type." />
            <FeatureRow icon={<Shield className="h-5 w-5" />} title="Admin & Student portals" desc="Manage the catalog or borrow your favorites." />
            <FeatureRow icon={<GraduationCap className="h-5 w-5" />} title="Track every loan" desc="Issue & return dates, due reminders, full history." />
          </div>
        </div>

        {/* Auth card */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md">
          <CardContent className="p-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="h-11 w-11 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
                <BookMarked className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Smart Library</h1>
              </div>
            </div>

            <h2 className="text-2xl font-bold gradient-text mb-1">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {tab === "login" ? "Sign in to continue your reading journey." : "Join the library — pick your role to get started."}
            </p>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={submitLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Username or Email</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" autoFocus value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="alex or alex@school.edu" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loginLoading} className="w-full gradient-bg text-white border-0 shadow-lg">
                    {loginLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    No account?{" "}
                    <button type="button" className="text-primary font-medium hover:underline" onClick={() => setTab("register")}>
                      Create one
                    </button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={submitRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" value={regUser} onChange={(e) => setRegUser(e.target.value)} placeholder="alex_chen" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="alex@school.edu" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" value={regPw} onChange={(e) => setRegPw(e.target.value)} placeholder="6+ chars" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm</Label>
                      <Input type="password" value={regPw2} onChange={(e) => setRegPw2(e.target.value)} placeholder="repeat" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Register as</Label>
                    <RadioGroup
                      value={regRole}
                      onValueChange={(v) => setRegRole(v as Role)}
                      className="grid grid-cols-2 gap-3"
                    >
                      <RoleCard
                        value="student"
                        active={regRole === "student"}
                        title="Student"
                        desc="Borrow & return"
                        icon={<GraduationCap className="h-5 w-5" />}
                        gradient="from-cyan-500 to-blue-600"
                      />
                      <RoleCard
                        value="admin"
                        active={regRole === "admin"}
                        title="Admin"
                        desc="Manage catalog"
                        icon={<Shield className="h-5 w-5" />}
                        gradient="from-fuchsia-500 to-purple-600"
                      />
                    </RadioGroup>
                  </div>
                  <Button type="submit" disabled={regLoading} className="w-full gradient-bg text-white border-0 shadow-lg">
                    {regLoading ? "Creating..." : "Create Account"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Already a member?{" "}
                    <button type="button" className="text-primary font-medium hover:underline" onClick={() => setTab("login")}>
                      Sign in
                    </button>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/15">
      <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-white/80">{desc}</div>
      </div>
    </div>
  );
}

function RoleCard({
  value, active, title, desc, icon, gradient,
}: {
  value: string; active: boolean; title: string; desc: string; icon: React.ReactNode; gradient: string;
}) {
  return (
    <Label
      htmlFor={`role-${value}`}
      className={`relative cursor-pointer rounded-xl p-3 border-2 transition-all ${
        active ? "border-primary shadow-md" : "border-border hover:border-primary/40"
      }`}
    >
      <RadioGroupItem id={`role-${value}`} value={value} className="sr-only" />
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow`}>
          {icon}
        </div>
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
    </Label>
  );
}
