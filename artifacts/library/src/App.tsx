import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { LibrarySystem, type User } from "@/lib/library";
import { AuthPage } from "@/pages/AuthPage";
import { AdminPage } from "@/pages/AdminPage";
import { StudentPage } from "@/pages/StudentPage";
import { BookMarked, LogOut, RotateCcw, Shield, GraduationCap, ChevronDown } from "lucide-react";

const queryClient = new QueryClient();
const lib = new LibrarySystem();

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full gradient-bg text-white flex items-center justify-center font-semibold shadow-md">
      {initial}
    </div>
  );
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { toast } = useToast();
  const [, force] = useState(0);

  const reset = () => {
    if (!confirm("Reset ALL data (books, users, loans, history)? You will be signed out.")) return;
    lib.resetData();
    toast({ title: "All data reset" });
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center shadow-md">
              <BookMarked className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight">Smart Library</h1>
              <p className="text-xs text-muted-foreground">
                {user.role === "admin" ? "Admin Console" : "Student Portal"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={
              user.role === "admin"
                ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white border-0"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0"
            }>
              {user.role === "admin" ? <Shield className="h-3 w-3 mr-1" /> : <GraduationCap className="h-3 w-3 mr-1" />}
              {user.role.toUpperCase()}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar name={user.username} />
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-semibold leading-tight">{user.username}</div>
                    <div className="text-xs text-muted-foreground leading-tight">{user.email}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="font-semibold">{user.username}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={reset} className="text-destructive focus:text-destructive">
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset All Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="rounded-2xl p-6 gradient-bg text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <p className="text-sm text-white/90">Welcome back,</p>
            <h2 className="text-3xl font-bold tracking-tight">{user.username} 👋</h2>
            <p className="text-white/85 mt-1 text-sm">
              {user.role === "admin"
                ? "Manage your catalog, track every loan, and keep the library humming."
                : "Find your next great read and keep track of what you've borrowed."}
            </p>
          </div>
        </div>

        {user.role === "admin" ? (
          <AdminPage lib={lib} currentUser={user} key={`admin-${force}`} />
        ) : (
          <StudentPage lib={lib} currentUser={user} key={`student-${force}`} />
        )}
      </main>
    </div>
  );
}

function AppShell() {
  const [user, setUser] = useState<User | null>(() => lib.getSession());

  useEffect(() => {
    if (user) {
      const fresh = lib.getSession();
      if (fresh && fresh.id !== user.id) setUser(fresh);
    }
  }, [user]);

  if (!user) {
    return <AuthPage lib={lib} onAuth={(u) => setUser(u)} />;
  }
  return (
    <Dashboard
      user={user}
      onLogout={() => {
        lib.logout();
        setUser(null);
      }}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
