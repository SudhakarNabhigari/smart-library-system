export type Role = "admin" | "student";

export type User = {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
};

export type Book = {
  id: number;
  title: string;
  author: string;
  genre: string;
  totalCopies: number;
  availableCopies: number;
  borrowCount: number;
};

export type Loan = {
  id: number;
  bookId: number;
  bookTitle: string;
  userId: number;
  username: string;
  issuedAt: string;
  dueAt: string;
  returnedAt: string | null;
};

export type ActionType = "ISSUE" | "RETURN" | "REGISTER" | "LOGIN";

export type HistoryEntry = {
  id: number;
  action: ActionType;
  bookId?: number;
  bookTitle?: string;
  userId: number;
  username: string;
  timestamp: string;
};

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  bookIds: Set<number> = new Set();
  isEnd = false;
}

export class Trie {
  private root = new TrieNode();
  insert(word: string, bookId: number) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch)!;
      node.bookIds.add(bookId);
    }
    node.isEnd = true;
  }
  remove(word: string, bookId: number) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      const next = node.children.get(ch);
      if (!next) return;
      node = next;
      node.bookIds.delete(bookId);
    }
  }
  searchPrefix(prefix: string): number[] {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      const next = node.children.get(ch);
      if (!next) return [];
      node = next;
    }
    return Array.from(node.bookIds);
  }
}

export class MaxHeap {
  private data: Book[] = [];
  push(b: Book) { this.data.push(b); this.bubbleUp(this.data.length - 1); }
  pop(): Book | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) { this.data[0] = last; this.bubbleDown(0); }
    return top;
  }
  size() { return this.data.length; }
  private bubbleUp(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].borrowCount < this.data[i].borrowCount) {
        [this.data[p], this.data[i]] = [this.data[i], this.data[p]]; i = p;
      } else break;
    }
  }
  private bubbleDown(i: number) {
    const n = this.data.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let largest = i;
      if (l < n && this.data[l].borrowCount > this.data[largest].borrowCount) largest = l;
      if (r < n && this.data[r].borrowCount > this.data[largest].borrowCount) largest = r;
      if (largest !== i) { [this.data[largest], this.data[i]] = [this.data[i], this.data[largest]]; i = largest; }
      else break;
    }
  }
}

const STORAGE_KEY = "smart-library-state-v3";
const SESSION_KEY = "smart-library-session-v3";
const LOAN_DAYS = 7;

async function hashPassword(pw: string): Promise<string> {
  const enc = new TextEncoder().encode(pw + "::smart-library::v3");
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class LibrarySystem {
  books: Book[] = [];
  users: User[] = [];
  loans: Loan[] = [];
  history: HistoryEntry[] = [];
  private titleTrie = new Trie();
  private nextBookId = 1;
  private nextUserId = 1;
  private nextLoanId = 1;
  private nextHistId = 1;

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        this.books = p.books ?? [];
        this.users = p.users ?? [];
        this.loans = p.loans ?? [];
        this.history = p.history ?? [];
        this.nextBookId = p.nextBookId ?? 1;
        this.nextUserId = p.nextUserId ?? 1;
        this.nextLoanId = p.nextLoanId ?? 1;
        this.nextHistId = p.nextHistId ?? 1;
        this.rebuildTrie();
        return;
      } catch { /* fall through */ }
    }
    this.seed();
    this.save();
  }

  private save() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      books: this.books, users: this.users, loans: this.loans, history: this.history,
      nextBookId: this.nextBookId, nextUserId: this.nextUserId,
      nextLoanId: this.nextLoanId, nextHistId: this.nextHistId,
    }));
  }

  private rebuildTrie() {
    this.titleTrie = new Trie();
    for (const b of this.books) this.indexBook(b);
  }
  private indexBook(b: Book) {
    this.titleTrie.insert(b.title, b.id);
    for (const w of b.title.split(/\s+/).filter(Boolean)) {
      if (w !== b.title) this.titleTrie.insert(w, b.id);
    }
  }
  private deindexBook(b: Book) {
    this.titleTrie.remove(b.title, b.id);
    for (const w of b.title.split(/\s+/).filter(Boolean)) {
      if (w !== b.title) this.titleTrie.remove(w, b.id);
    }
  }

  private seed() {
    const sample: Omit<Book, "id" | "availableCopies" | "borrowCount">[] = [
      { title: "Introduction to Algorithms", author: "Cormen et al.", genre: "Computer Science", totalCopies: 5 },
      { title: "The Pragmatic Programmer", author: "Andy Hunt", genre: "Computer Science", totalCopies: 3 },
      { title: "Clean Code", author: "Robert C. Martin", genre: "Computer Science", totalCopies: 4 },
      { title: "Design Patterns", author: "Gamma et al.", genre: "Computer Science", totalCopies: 2 },
      { title: "The C++ Programming Language", author: "Bjarne Stroustrup", genre: "Computer Science", totalCopies: 6 },
      { title: "Atomic Habits", author: "James Clear", genre: "Self-Help", totalCopies: 4 },
      { title: "Sapiens", author: "Yuval Noah Harari", genre: "History", totalCopies: 3 },
      { title: "Deep Work", author: "Cal Newport", genre: "Self-Help", totalCopies: 2 },
      { title: "The Lean Startup", author: "Eric Ries", genre: "Business", totalCopies: 3 },
      { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", genre: "Psychology", totalCopies: 4 },
    ];
    sample.forEach((s) => this.addBookSilent(s.title, s.author, s.genre, s.totalCopies));
  }

  private addBookSilent(title: string, author: string, genre: string, copies: number): Book {
    const b: Book = {
      id: this.nextBookId++, title: title.trim(), author: author.trim(),
      genre: genre.trim() || "General", totalCopies: copies,
      availableCopies: copies, borrowCount: 0,
    };
    this.books.push(b);
    this.indexBook(b);
    return b;
  }

  // --- Auth ---
  async register(username: string, email: string, password: string, role: Role): Promise<{ ok: boolean; reason?: string; user?: User }> {
    const u = username.trim();
    const e = email.trim().toLowerCase();
    if (!u) return { ok: false, reason: "Username is required" };
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(u)) return { ok: false, reason: "Username must be 3-20 chars (letters, numbers, _ .)" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, reason: "Invalid email address" };
    if (password.length < 6) return { ok: false, reason: "Password must be at least 6 characters" };
    if (this.users.some((x) => x.username.toLowerCase() === u.toLowerCase())) return { ok: false, reason: "Username already taken" };
    if (this.users.some((x) => x.email === e)) return { ok: false, reason: "Email already registered" };
    const passwordHash = await hashPassword(password);
    const user: User = {
      id: this.nextUserId++, username: u, email: e, passwordHash,
      role, createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    this.history.push({
      id: this.nextHistId++, action: "REGISTER",
      userId: user.id, username: user.username, timestamp: new Date().toISOString(),
    });
    this.save();
    return { ok: true, user };
  }

  async login(identifier: string, password: string): Promise<{ ok: boolean; reason?: string; user?: User }> {
    const id = identifier.trim().toLowerCase();
    const user = this.users.find((u) => u.username.toLowerCase() === id || u.email === id);
    if (!user) return { ok: false, reason: "User not found" };
    const ph = await hashPassword(password);
    if (ph !== user.passwordHash) return { ok: false, reason: "Incorrect password" };
    this.history.push({
      id: this.nextHistId++, action: "LOGIN",
      userId: user.id, username: user.username, timestamp: new Date().toISOString(),
    });
    this.save();
    window.localStorage.setItem(SESSION_KEY, String(user.id));
    return { ok: true, user };
  }

  logout() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(SESSION_KEY);
  }

  getSession(): User | null {
    if (typeof window === "undefined") return null;
    const id = window.localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return this.users.find((u) => u.id === Number(id)) ?? null;
  }

  hasAdmin(): boolean { return this.users.some((u) => u.role === "admin"); }

  // --- CRUD ---
  addBook(title: string, author: string, genre: string, copies: number): Book | null {
    if (!title.trim() || !author.trim() || copies < 0) return null;
    const b = this.addBookSilent(title, author, genre, copies);
    this.save();
    return b;
  }

  deleteBook(id: number): boolean {
    const idx = this.books.findIndex((b) => b.id === id);
    if (idx < 0) return false;
    this.deindexBook(this.books[idx]);
    this.books.splice(idx, 1);
    this.save();
    return true;
  }

  updateBook(id: number, title: string, author: string, genre: string, copies: number): boolean {
    const b = this.books.find((x) => x.id === id);
    if (!b) return false;
    const issued = b.totalCopies - b.availableCopies;
    if (copies < issued) return false;
    if (b.title !== title.trim()) {
      this.deindexBook(b); b.title = title.trim(); this.indexBook(b);
    }
    b.author = author.trim();
    b.genre = genre.trim() || "General";
    b.totalCopies = copies;
    b.availableCopies = copies - issued;
    this.save();
    return true;
  }

  searchById(id: number): Book | null {
    const sorted = [...this.books].sort((a, b) => a.id - b.id);
    let lo = 0, hi = sorted.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].id === id) return sorted[mid];
      if (sorted[mid].id < id) lo = mid + 1; else hi = mid - 1;
    }
    return null;
  }

  prefixSearch(prefix: string): Book[] {
    if (!prefix.trim()) return [];
    const ids = new Set(this.titleTrie.searchPrefix(prefix.trim()));
    return this.books.filter((b) => ids.has(b.id));
  }

  // --- Loans ---
  issueBook(bookId: number, user: User): { ok: boolean; reason?: string; loan?: Loan } {
    const b = this.books.find((x) => x.id === bookId);
    if (!b) return { ok: false, reason: "Book not found" };
    if (b.availableCopies <= 0) return { ok: false, reason: "No copies available" };
    const active = this.loans.find(
      (l) => l.bookId === bookId && l.userId === user.id && !l.returnedAt
    );
    if (active) return { ok: false, reason: "You already borrowed this book" };
    const now = new Date();
    const due = new Date(now.getTime() + LOAN_DAYS * 24 * 60 * 60 * 1000);
    const loan: Loan = {
      id: this.nextLoanId++, bookId: b.id, bookTitle: b.title,
      userId: user.id, username: user.username,
      issuedAt: now.toISOString(), dueAt: due.toISOString(), returnedAt: null,
    };
    this.loans.push(loan);
    b.availableCopies--; b.borrowCount++;
    this.history.push({
      id: this.nextHistId++, action: "ISSUE", bookId: b.id, bookTitle: b.title,
      userId: user.id, username: user.username, timestamp: now.toISOString(),
    });
    this.save();
    return { ok: true, loan };
  }

  returnBook(loanId: number, actor: User): { ok: boolean; reason?: string } {
    const loan = this.loans.find((l) => l.id === loanId);
    if (!loan) return { ok: false, reason: "Loan not found" };
    if (loan.returnedAt) return { ok: false, reason: "Already returned" };
    if (actor.role !== "admin" && loan.userId !== actor.id) return { ok: false, reason: "Not your loan" };
    const b = this.books.find((x) => x.id === loan.bookId);
    if (!b) return { ok: false, reason: "Book not found" };
    loan.returnedAt = new Date().toISOString();
    b.availableCopies = Math.min(b.totalCopies, b.availableCopies + 1);
    this.history.push({
      id: this.nextHistId++, action: "RETURN", bookId: b.id, bookTitle: b.title,
      userId: loan.userId, username: loan.username, timestamp: loan.returnedAt,
    });
    this.save();
    return { ok: true };
  }

  loansForUser(userId: number): Loan[] {
    return this.loans.filter((l) => l.userId === userId).sort((a, b) => b.id - a.id);
  }

  activeLoans(): Loan[] {
    return this.loans.filter((l) => !l.returnedAt).sort((a, b) => b.id - a.id);
  }

  topBorrowed(k: number): Book[] {
    const heap = new MaxHeap();
    for (const b of this.books) heap.push({ ...b });
    const out: Book[] = [];
    for (let i = 0; i < k && heap.size() > 0; i++) out.push(heap.pop()!);
    return out;
  }

  sorted(mode: "title" | "author" | "borrow" | "id"): Book[] {
    const c = [...this.books];
    if (mode === "title") return c.sort((a, b) => a.title.localeCompare(b.title));
    if (mode === "author") return c.sort((a, b) => a.author.localeCompare(b.author));
    if (mode === "borrow") return c.sort((a, b) => b.borrowCount - a.borrowCount);
    return c.sort((a, b) => a.id - b.id);
  }

  resetData() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_KEY);
    }
    this.books = []; this.users = []; this.loans = []; this.history = [];
    this.nextBookId = 1; this.nextUserId = 1; this.nextLoanId = 1; this.nextHistId = 1;
    this.titleTrie = new Trie();
    this.seed();
    this.save();
  }
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function loanStatus(loan: Loan): { label: string; tone: "active" | "overdue" | "returned"; days: number } {
  if (loan.returnedAt) {
    const days = daysBetween(new Date(loan.returnedAt), new Date(loan.issuedAt));
    return { label: `Returned (held ${days}d)`, tone: "returned", days };
  }
  const now = new Date();
  const days = daysBetween(now, new Date(loan.issuedAt));
  const overdue = now > new Date(loan.dueAt);
  return {
    label: overdue ? `Overdue (${days}d)` : `Active (${days}d)`,
    tone: overdue ? "overdue" : "active",
    days,
  };
}
