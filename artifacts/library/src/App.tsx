import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LibrarySystem, type Book, type HistoryEntry } from "@/lib/library";
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  History,
  ArrowUpDown,
  Library as LibraryIcon,
  RotateCcw,
} from "lucide-react";

const queryClient = new QueryClient();
const lib = new LibrarySystem();

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BookTable({
  books,
  onEdit,
  onDelete,
  onIssue,
  onReturn,
}: {
  books: Book[];
  onEdit?: (b: Book) => void;
  onDelete?: (b: Book) => void;
  onIssue?: (b: Book) => void;
  onReturn?: (b: Book) => void;
}) {
  if (books.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No books to display.
      </div>
    );
  }
  return (
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
            {(onEdit || onDelete || onIssue || onReturn) && (
              <TableHead className="text-right w-[260px]">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {b.id}
              </TableCell>
              <TableCell className="font-medium">{b.title}</TableCell>
              <TableCell className="text-muted-foreground">{b.author}</TableCell>
              <TableCell>
                <Badge variant="secondary">{b.genre}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {b.availableCopies} / {b.totalCopies}
              </TableCell>
              <TableCell className="text-right tabular-nums">{b.borrowCount}</TableCell>
              {(onEdit || onDelete || onIssue || onReturn) && (
                <TableCell className="text-right space-x-1">
                  {onIssue && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onIssue(b)}
                      disabled={b.availableCopies === 0}
                    >
                      Issue
                    </Button>
                  )}
                  {onReturn && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReturn(b)}
                      disabled={b.availableCopies === b.totalCopies}
                    >
                      Return
                    </Button>
                  )}
                  {onEdit && (
                    <Button size="icon" variant="ghost" onClick={() => onEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(b)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LibraryApp() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate((x) => x + 1);

  // Form state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [copies, setCopies] = useState("1");

  // Search state
  const [searchById, setSearchById] = useState("");
  const [searchByTitle, setSearchByTitle] = useState("");
  const [prefixQuery, setPrefixQuery] = useState("");
  const [foundById, setFoundById] = useState<Book | null | undefined>(undefined);
  const [foundByTitle, setFoundByTitle] = useState<Book[] | undefined>(undefined);
  const [foundByPrefix, setFoundByPrefix] = useState<Book[] | undefined>(undefined);

  // Sort
  const [sortMode, setSortMode] = useState<"id" | "title" | "author" | "borrow">("id");
  const [topK, setTopK] = useState("5");

  // Edit dialog
  const [editing, setEditing] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editCopies, setEditCopies] = useState("0");

  // Issue/Return dialog
  const [transacting, setTransacting] = useState<{ book: Book; mode: "ISSUE" | "RETURN" } | null>(
    null
  );
  const [transUser, setTransUser] = useState("");

  const sortedBooks = useMemo(() => lib.sorted(sortMode), [sortMode, lib.books.length]);
  const topBorrowed = useMemo(() => lib.topBorrowed(Number(topK) || 5), [topK, lib.books.length]);
  const history: HistoryEntry[] = useMemo(() => [...lib.history].reverse(), [lib.history.length]);

  const totalBooks = lib.books.length;
  const totalCopies = lib.books.reduce((s, b) => s + b.totalCopies, 0);
  const totalAvailable = lib.books.reduce((s, b) => s + b.availableCopies, 0);
  const totalIssued = totalCopies - totalAvailable;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseInt(copies, 10);
    if (!title.trim() || !author.trim() || isNaN(c) || c < 0) {
      toast({ title: "Invalid input", description: "Title, author and a non-negative copy count are required.", variant: "destructive" });
      return;
    }
    const b = lib.addBook(title, author, genre, c);
    if (!b) {
      toast({ title: "Failed to add book", variant: "destructive" });
      return;
    }
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
    setEditing(b);
    setEditTitle(b.title);
    setEditAuthor(b.author);
    setEditGenre(b.genre);
    setEditCopies(String(b.totalCopies));
  };

  const submitEdit = () => {
    if (!editing) return;
    const c = parseInt(editCopies, 10);
    if (isNaN(c) || c < 0) {
      toast({ title: "Invalid copies", variant: "destructive" });
      return;
    }
    const ok = lib.updateBook(editing.id, editTitle, editAuthor, editGenre, c);
    if (!ok) {
      toast({
        title: "Update failed",
        description: "New total copies cannot be less than currently issued copies.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Updated" });
    setEditing(null);
    refresh();
  };

  const openTransaction = (book: Book, mode: "ISSUE" | "RETURN") => {
    setTransacting({ book, mode });
    setTransUser("");
  };

  const submitTransaction = () => {
    if (!transacting) return;
    const fn = transacting.mode === "ISSUE" ? lib.issueBook.bind(lib) : lib.returnBook.bind(lib);
    const res = fn(transacting.book.id, transUser);
    if (!res.ok) {
      toast({ title: "Action failed", description: res.reason, variant: "destructive" });
      return;
    }
    toast({
      title: transacting.mode === "ISSUE" ? "Book issued" : "Book returned",
      description: `${transacting.book.title} — ${transUser}`,
    });
    setTransacting(null);
    refresh();
  };

  const doSearchById = () => {
    const id = parseInt(searchById, 10);
    if (isNaN(id)) { setFoundById(null); return; }
    setFoundById(lib.searchById(id));
  };

  const doSearchByTitle = () => setFoundByTitle(lib.searchByTitle(searchByTitle));
  const doPrefix = () => setFoundByPrefix(lib.prefixSearch(prefixQuery));

  const reset = () => {
    if (!confirm("Reset all data and reload sample books?")) return;
    lib.resetData();
    toast({ title: "Library reset" });
    refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <LibraryIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Smart Library Management</h1>
              <p className="text-xs text-muted-foreground">
                Vector · Stack · Heap · Trie · Binary Search
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset Data
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Titles" value={totalBooks} />
          <StatCard icon={LibraryIcon} label="Total Copies" value={totalCopies} />
          <StatCard icon={ArrowUpDown} label="Available" value={totalAvailable} />
          <StatCard icon={TrendingUp} label="Issued" value={totalIssued} />
        </div>

        <Tabs defaultValue="catalog" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="add">Add Book</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="top">Top Borrowed</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Catalog</CardTitle>
                  <CardDescription>Manage every book in the library.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Sort by</Label>
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">ID</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                      <SelectItem value="borrow">Borrow Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <BookTable
                  books={sortedBooks}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onIssue={(b) => openTransaction(b, "ISSUE")}
                  onReturn={(b) => openTransaction(b, "RETURN")}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Add a Book</CardTitle>
                <CardDescription>Adds the book to the vector store and indexes its title in the Trie.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Pragmatic Programmer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Author</Label>
                    <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Andy Hunt" />
                  </div>
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Computer Science" />
                  </div>
                  <div className="space-y-2">
                    <Label>Copies</Label>
                    <Input type="number" min={0} value={copies} onChange={(e) => setCopies(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit"><Plus className="h-4 w-4 mr-2" /> Add Book</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search by ID</CardTitle>
                <CardDescription>O(log n) binary search on the sorted ID index.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Book ID" value={searchById} onChange={(e) => setSearchById(e.target.value)} />
                  <Button onClick={doSearchById}><Search className="h-4 w-4 mr-2" /> Search</Button>
                </div>
                {foundById !== undefined && (
                  foundById ? (
                    <div className="p-4 rounded-md border bg-muted/40">
                      <div className="font-medium">{foundById.title}</div>
                      <div className="text-sm text-muted-foreground">
                        by {foundById.author} · {foundById.genre} · {foundById.availableCopies}/{foundById.totalCopies} available · borrowed {foundById.borrowCount} times
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No book found with that ID.</div>
                  )
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Search by Exact Title</CardTitle>
                <CardDescription>Linear scan with case-insensitive equality.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Exact title" value={searchByTitle} onChange={(e) => setSearchByTitle(e.target.value)} />
                  <Button onClick={doSearchByTitle}><Search className="h-4 w-4 mr-2" /> Search</Button>
                </div>
                {foundByTitle && <BookTable books={foundByTitle} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prefix Search (Trie)</CardTitle>
                <CardDescription>Type any prefix — the Trie returns matching titles instantly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder='e.g. "the", "clean", "design"'
                    value={prefixQuery}
                    onChange={(e) => {
                      setPrefixQuery(e.target.value);
                      setFoundByPrefix(lib.prefixSearch(e.target.value));
                    }}
                  />
                  <Button onClick={doPrefix}><Search className="h-4 w-4 mr-2" /> Search</Button>
                </div>
                {foundByPrefix && <BookTable books={foundByPrefix} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Top Borrowed</CardTitle>
                  <CardDescription>Pulled from a max-heap on borrow count.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Top K</Label>
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={topK}
                    onChange={(e) => setTopK(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <BookTable books={topBorrowed} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>LIFO stack of issue and return events (newest first).</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No activity yet. Issue or return a book to see entries here.
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Book</TableHead>
                          <TableHead>User</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((h, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm text-muted-foreground">{formatTime(h.timestamp)}</TableCell>
                            <TableCell>
                              <Badge variant={h.action === "ISSUE" ? "default" : "secondary"}>
                                {h.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{h.bookTitle}</TableCell>
                            <TableCell>{h.user}</TableCell>
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

        <footer className="text-center text-xs text-muted-foreground py-4">
          Data persists in your browser via localStorage. Click Reset Data to start over.
        </footer>
      </main>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>Update the book's details. New total copies must be at least the number currently issued.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Author</Label><Input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} /></div>
            <div className="space-y-2"><Label>Genre</Label><Input value={editGenre} onChange={(e) => setEditGenre(e.target.value)} /></div>
            <div className="space-y-2"><Label>Total Copies</Label><Input type="number" min={0} value={editCopies} onChange={(e) => setEditCopies(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={submitEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue / Return dialog */}
      <Dialog open={!!transacting} onOpenChange={(o) => !o && setTransacting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transacting?.mode === "ISSUE" ? "Issue Book" : "Return Book"}
            </DialogTitle>
            <DialogDescription>
              {transacting?.book.title} by {transacting?.book.author}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>User name</Label>
            <Input
              autoFocus
              value={transUser}
              onChange={(e) => setTransUser(e.target.value)}
              placeholder="e.g. Alex Chen"
              onKeyDown={(e) => { if (e.key === "Enter") submitTransaction(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransacting(null)}>Cancel</Button>
            <Button onClick={submitTransaction}>
              {transacting?.mode === "ISSUE" ? (
                <><BookOpen className="h-4 w-4 mr-2" /> Issue</>
              ) : (
                <><History className="h-4 w-4 mr-2" /> Return</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LibraryApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
