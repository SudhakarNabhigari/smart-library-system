import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { LibrarySystem, type User, formatDateTime, loanStatus, daysBetween } from "@/lib/library";
import { BookOpen, Search, BookCheck, Clock, Library as LibraryIcon, Sparkles } from "lucide-react";

function GradientStat({
  icon: Icon, label, value, gradient,
}: { icon: typeof BookOpen; label: string; value: string | number; gradient: string }) {
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentPage({ lib, currentUser }: { lib: LibrarySystem; currentUser: User }) {
  const { toast } = useToast();
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);

  const [query, setQuery] = useState("");

  const myLoans = useMemo(() => lib.loansForUser(currentUser.id), [currentUser.id, lib.loans.length]);
  const activeMyLoans = myLoans.filter((l) => !l.returnedAt);
  const allBooks = useMemo(() => lib.sorted("title"), [lib.books.length]);

  const filteredBooks = useMemo(() => {
    const q = query.trim();
    if (!q) return allBooks;
    // Use Trie prefix search if available; fallback to substring
    const prefixHits = new Set(lib.prefixSearch(q).map((b) => b.id));
    return allBooks.filter(
      (b) =>
        prefixHits.has(b.id) ||
        b.title.toLowerCase().includes(q.toLowerCase()) ||
        b.author.toLowerCase().includes(q.toLowerCase())
    );
  }, [query, allBooks, lib]);

  const handleBorrow = (bookId: number) => {
    const r = lib.issueBook(bookId, currentUser);
    if (!r.ok) { toast({ title: "Cannot borrow", description: r.reason, variant: "destructive" }); return; }
    toast({
      title: "Book borrowed (7-day loan)",
      description: `Return by ${new Date(r.loan!.dueAt).toLocaleString()}`,
    });
    refresh();
  };

  const handleReturn = (loanId: number) => {
    const r = lib.returnBook(loanId, currentUser);
    if (!r.ok) { toast({ title: "Cannot return", description: r.reason, variant: "destructive" }); return; }
    toast({ title: "Returned. Thank you!" });
    refresh();
  };

  const totalRead = myLoans.filter((l) => l.returnedAt).length;
  const overdue = activeMyLoans.filter((l) => new Date() > new Date(l.dueAt)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GradientStat icon={BookCheck} label="Currently Borrowed" value={activeMyLoans.length} gradient="from-emerald-500 to-teal-500" />
        <GradientStat icon={Sparkles} label="Books Read" value={totalRead} gradient="from-violet-500 to-purple-600" />
        <GradientStat icon={Clock} label="Overdue" value={overdue} gradient="from-rose-500 to-orange-500" />
        <GradientStat icon={LibraryIcon} label="Catalog Size" value={lib.books.length} gradient="from-blue-500 to-cyan-500" />
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="my-loans">My Active Loans</TabsTrigger>
          <TabsTrigger value="history">My History</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <Card>
            <CardHeader>
              <CardTitle>Browse the Library</CardTitle>
              <CardDescription>
                Live search — results update as you type, powered by a Trie prefix index.
                Borrowed books must be returned within <span className="font-semibold text-primary">7 days</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder='Try "the", "clean", "design"...'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {filteredBooks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No books match your search.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBooks.map((b) => {
                    const alreadyBorrowed = activeMyLoans.some((l) => l.bookId === b.id);
                    return (
                      <div
                        key={b.id}
                        className="rounded-xl border overflow-hidden bg-card shadow-sm hover:shadow-lg transition-shadow"
                      >
                        <div className="h-2 bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500" />
                        <div className="p-4 space-y-3">
                          <div>
                            <div className="font-semibold leading-tight">{b.title}</div>
                            <div className="text-sm text-muted-foreground">by {b.author}</div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <Badge variant="secondary">{b.genre}</Badge>
                            <span className={b.availableCopies > 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                              {b.availableCopies > 0 ? `${b.availableCopies} available` : "All borrowed"}
                            </span>
                          </div>
                          <Button
                            className="w-full gradient-bg text-white border-0"
                            disabled={b.availableCopies === 0 || alreadyBorrowed}
                            onClick={() => handleBorrow(b.id)}
                          >
                            {alreadyBorrowed ? "Already in your loans" : "Borrow"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-loans">
          <Card>
            <CardHeader>
              <CardTitle>Books you have right now</CardTitle>
              <CardDescription>Return them before the due date to stay in good standing.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeMyLoans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  You don't have any books checked out. Browse the catalog to borrow one!
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeMyLoans.map((l) => {
                        const status = loanStatus(l);
                        const heldDays = daysBetween(new Date(), new Date(l.issuedAt));
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.bookTitle}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDateTime(l.issuedAt)}</TableCell>
                            <TableCell className="text-sm">{formatDateTime(l.dueAt)}</TableCell>
                            <TableCell>
                              <Badge className={
                                status.tone === "overdue"
                                  ? "bg-rose-500 text-white hover:bg-rose-500"
                                  : "bg-emerald-500 text-white hover:bg-emerald-500"
                              }>
                                {status.label} · {heldDays}d
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => handleReturn(l.id)}>
                                Return
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Your borrowing history</CardTitle>
              <CardDescription>Every book you've borrowed and returned.</CardDescription>
            </CardHeader>
            <CardContent>
              {myLoans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No history yet.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Returned</TableHead>
                        <TableHead>Days Held</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myLoans.map((l) => {
                        const status = loanStatus(l);
                        const days = l.returnedAt
                          ? daysBetween(new Date(l.returnedAt), new Date(l.issuedAt))
                          : daysBetween(new Date(), new Date(l.issuedAt));
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.bookTitle}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDateTime(l.issuedAt)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {l.returnedAt ? formatDateTime(l.returnedAt) : <span className="italic">not yet</span>}
                            </TableCell>
                            <TableCell className="tabular-nums">{days}d</TableCell>
                            <TableCell>
                              <Badge className={
                                status.tone === "returned" ? "bg-blue-500 text-white hover:bg-blue-500" :
                                status.tone === "overdue" ? "bg-rose-500 text-white hover:bg-rose-500" :
                                "bg-emerald-500 text-white hover:bg-emerald-500"
                              }>
                                {status.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
