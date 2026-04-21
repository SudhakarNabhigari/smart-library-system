import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  LibrarySystem, type User, type Book,
  formatDateTime, loanStatus, daysBetween,
} from "@/lib/library";
import {
  BookOpen, Plus, Trash2, Pencil, TrendingUp, History as HistoryIcon,
  Users, BookCheck, Library as LibraryIcon, AlertCircle, Search,
  ClipboardList, BookPlus, Trophy,
} from "lucide-react";

function GradientStat({
  icon: Icon, label, value, gradient,
}: { icon: typeof BookOpen; label: string; value: string | number; gradient: string }) {
  return (
    <Card className="overflow-hidden border-0 shadow-md rounded-2xl card-hover">
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md icon-pulse`}>
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

export function AdminPage({ lib, currentUser }: { lib: LibrarySystem; currentUser: User }) {
  const { toast } = useToast();
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [copies, setCopies] = useState("1");

  const [sortMode, setSortMode] = useState<"id" | "title" | "author" | "borrow">("id");
  const [bookFilter, setBookFilter] = useState("");

  const [editing, setEditing] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editCopies, setEditCopies] = useState("0");

  const sortedBooks = useMemo(() => lib.sorted(sortMode), [sortMode, lib.books.length]);
  const filteredBooks = useMemo(() => {
    const q = bookFilter.trim().toLowerCase();
    if (!q) return sortedBooks;
    return sortedBooks.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }, [sortedBooks, bookFilter]);

  const totalBooks = lib.books.length;
  const totalCopies = lib.books.reduce((s, b) => s + b.totalCopies, 0);
  const issuedCount = lib.books.reduce((s, b) => s + (b.totalCopies - b.availableCopies), 0);
  const activeLoans = lib.activeLoans();
  const overdueCount = activeLoans.filter((l) => new Date() > new Date(l.dueAt)).length;
  const studentCount = lib.users.filter((u) => u.role === "student").length;
  const top5 = lib.topBorrowed(5);
  const history = useMemo(() => [...lib.history].reverse(), [lib.history.length]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseInt(copies, 10);
    if (!title.trim() || !author.trim() || isNaN(c) || c < 0) {
      toast({ title: "Invalid input", description: "Title, author and a non-negative copy count are required.", variant: "destructive" });
      return;
    }
    const b = lib.addBook(title, author, genre, c);
    if (!b) { toast({ title: "Failed to add", variant: "destructive" }); return; }
    toast({ title: "Book added", description: `"${b.title}" is now in the catalog.` });
    setTitle(""); setAuthor(""); setGenre(""); setCopies("1");
    refresh();
  };

  const handleDelete = (b: Book) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    if (lib.deleteBook(b.id)) {
      toast({ title: "Deleted", description: b.title });
      refresh();
    }
  };

  const openEdit = (b: Book) => {
    setEditing(b); setEditTitle(b.title); setEditAuthor(b.author);
    setEditGenre(b.genre); setEditCopies(String(b.totalCopies));
  };

  const submitEdit = () => {
    if (!editing) return;
    const c = parseInt(editCopies, 10);
    if (isNaN(c) || c < 0) { toast({ title: "Invalid copies", variant: "destructive" }); return; }
    const ok = lib.updateBook(editing.id, editTitle, editAuthor, editGenre, c);
    if (!ok) {
      toast({ title: "Update failed", description: "New total cannot be less than currently issued.", variant: "destructive" });
      return;
    }
    toast({ title: "Book updated" });
    setEditing(null); refresh();
  };

  const forceReturn = (loanId: number) => {
    const r = lib.returnBook(loanId, currentUser);
    if (!r.ok) { toast({ title: "Failed", description: r.reason, variant: "destructive" }); return; }
    toast({ title: "Marked as returned" });
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <GradientStat icon={LibraryIcon} label="Titles" value={totalBooks} gradient="from-emerald-700 to-emerald-500" />
        <GradientStat icon={BookOpen} label="Total Copies" value={totalCopies} gradient="from-emerald-600 to-green-400" />
        <GradientStat icon={BookCheck} label="Currently Issued" value={issuedCount} gradient="from-teal-600 to-emerald-400" />
        <GradientStat icon={AlertCircle} label="Overdue" value={overdueCount} gradient="from-rose-500 to-orange-500" />
        <GradientStat icon={Users} label="Students" value={studentCount} gradient="from-emerald-500 to-lime-400" />
        <GradientStat icon={TrendingUp} label="Total Borrows" value={lib.books.reduce((s, b) => s + b.borrowCount, 0)} gradient="from-green-700 to-emerald-500" />
      </div>

      <Tabs defaultValue="loans" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 rounded-2xl p-1.5 h-auto gap-1">
          <TabsTrigger value="loans" className="rounded-xl gap-2 py-2.5">
            <ClipboardList className="h-4 w-4" /> Active Loans
          </TabsTrigger>
          <TabsTrigger value="catalog" className="rounded-xl gap-2 py-2.5">
            <LibraryIcon className="h-4 w-4" /> Catalog
          </TabsTrigger>
          <TabsTrigger value="add" className="rounded-xl gap-2 py-2.5">
            <BookPlus className="h-4 w-4" /> Add Book
          </TabsTrigger>
          <TabsTrigger value="top" className="rounded-xl gap-2 py-2.5">
            <Trophy className="h-4 w-4" /> Top Borrowed
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl gap-2 py-2.5">
            <HistoryIcon className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="loans">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Who has what?</CardTitle>
              <CardDescription>Every book currently checked out, with due-date tracking.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeLoans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No active loans right now.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Book</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Days Held</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="row-hover">
                      {activeLoans.map((l) => {
                        const status = loanStatus(l);
                        const heldDays = daysBetween(new Date(), new Date(l.issuedAt));
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.username}</TableCell>
                            <TableCell>{l.bookTitle}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDateTime(l.issuedAt)}</TableCell>
                            <TableCell className="text-sm">{formatDateTime(l.dueAt)}</TableCell>
                            <TableCell className="tabular-nums">{heldDays}d</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  status.tone === "overdue"
                                    ? "bg-rose-500 text-white hover:bg-rose-500"
                                    : "bg-emerald-500 text-white hover:bg-emerald-500"
                                }
                              >
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => forceReturn(l.id)}>
                                Mark Returned
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

        <TabsContent value="catalog">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Catalog</CardTitle>
                <CardDescription>Add, update, or remove books from the library.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 w-56"
                    placeholder="Filter by title/author"
                    value={bookFilter}
                    onChange={(e) => setBookFilter(e.target.value)}
                  />
                </div>
                <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">Sort: ID</SelectItem>
                    <SelectItem value="title">Sort: Title</SelectItem>
                    <SelectItem value="author">Sort: Author</SelectItem>
                    <SelectItem value="borrow">Sort: Borrows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Genre</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Borrowed</TableHead>
                      <TableHead className="text-right w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="row-hover">
                    {filteredBooks.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{b.id}</TableCell>
                        <TableCell className="font-medium">{b.title}</TableCell>
                        <TableCell className="text-muted-foreground">{b.author}</TableCell>
                        <TableCell><Badge variant="secondary">{b.genre}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{b.availableCopies} / {b.totalCopies}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.borrowCount}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(b)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Add a New Book</CardTitle>
              <CardDescription>The book is added to the catalog and indexed in the prefix-search Trie.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Pragmatic Programmer" />
                </div>
                <div className="space-y-2"><Label>Author</Label>
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Andy Hunt" />
                </div>
                <div className="space-y-2"><Label>Genre</Label>
                  <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Computer Science" />
                </div>
                <div className="space-y-2"><Label>Copies</Label>
                  <Input type="number" min={0} value={copies} onChange={(e) => setCopies(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="gradient-bg text-white border-0 shadow-md">
                    <Plus className="h-4 w-4 mr-2" /> Add Book
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Top 5 Most Borrowed</CardTitle>
              <CardDescription>Pulled from a max-heap on borrow count.</CardDescription>
            </CardHeader>
            <CardContent>
              {top5.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No data yet.</div>
              ) : (
                <div className="space-y-3">
                  {top5.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-violet-50 to-pink-50">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
                        i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                        i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-600" :
                        i === 2 ? "bg-gradient-to-br from-amber-700 to-orange-700" :
                        "bg-gradient-to-br from-violet-500 to-purple-600"
                      }`}>
                        #{i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{b.title}</div>
                        <div className="text-sm text-muted-foreground">{b.author} · {b.genre}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold gradient-text">{b.borrowCount}</div>
                        <div className="text-xs text-muted-foreground">borrows</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Full Activity History</CardTitle>
              <CardDescription>LIFO stack — newest events first. Includes registrations, logins, issues and returns.</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No activity yet.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Book</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="row-hover">
                      {history.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-sm text-muted-foreground">{formatDateTime(h.timestamp)}</TableCell>
                          <TableCell>
                            <Badge className={
                              h.action === "ISSUE" ? "bg-emerald-500 text-white hover:bg-emerald-500" :
                              h.action === "RETURN" ? "bg-blue-500 text-white hover:bg-blue-500" :
                              h.action === "REGISTER" ? "bg-violet-500 text-white hover:bg-violet-500" :
                              "bg-slate-500 text-white hover:bg-slate-500"
                            }>
                              {h.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{h.username}</TableCell>
                          <TableCell>{h.bookTitle ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>Update details. Total copies must be ≥ currently issued.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Author</Label><Input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} /></div>
            <div className="space-y-2"><Label>Genre</Label><Input value={editGenre} onChange={(e) => setEditGenre(e.target.value)} /></div>
            <div className="space-y-2"><Label>Total Copies</Label><Input type="number" min={0} value={editCopies} onChange={(e) => setEditCopies(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={submitEdit} className="gradient-bg text-white border-0">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// re-export icon used in stats
export { HistoryIcon };
