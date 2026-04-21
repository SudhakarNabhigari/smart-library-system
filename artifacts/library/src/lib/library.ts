export type Book = {
  id: number;
  title: string;
  author: string;
  genre: string;
  totalCopies: number;
  availableCopies: number;
  borrowCount: number;
};

export type ActionType = "ISSUE" | "RETURN";

export type HistoryEntry = {
  action: ActionType;
  bookId: number;
  bookTitle: string;
  user: string;
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

// Max-heap on borrowCount
export class MaxHeap {
  private data: Book[] = [];

  push(b: Book) {
    this.data.push(b);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): Book | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  size() {
    return this.data.length;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[parent].borrowCount < this.data[i].borrowCount) {
        [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
        i = parent;
      } else break;
    }
  }

  private bubbleDown(i: number) {
    const n = this.data.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let largest = i;
      if (l < n && this.data[l].borrowCount > this.data[largest].borrowCount) largest = l;
      if (r < n && this.data[r].borrowCount > this.data[largest].borrowCount) largest = r;
      if (largest !== i) {
        [this.data[largest], this.data[i]] = [this.data[i], this.data[largest]];
        i = largest;
      } else break;
    }
  }
}

const STORAGE_KEY = "smart-library-state-v1";

export class LibrarySystem {
  books: Book[] = []; // vector
  history: HistoryEntry[] = []; // stack (push/pop at end)
  private titleTrie = new Trie();
  private nextId = 1;

  constructor() {
    this.load();
  }

  // --- Persistence ---
  private load() {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.books = parsed.books ?? [];
        this.history = parsed.history ?? [];
        this.nextId = parsed.nextId ?? 1;
        this.rebuildTrie();
        return;
      } catch {
        /* fall through to seed */
      }
    }
    this.seed();
    this.save();
  }

  private save() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ books: this.books, history: this.history, nextId: this.nextId })
    );
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
    ];
    sample.forEach((s) => this.addBook(s.title, s.author, s.genre, s.totalCopies, false));
  }

  // --- CRUD ---
  addBook(title: string, author: string, genre: string, copies: number, persist = true): Book | null {
    if (!title.trim() || !author.trim() || copies < 0) return null;
    const b: Book = {
      id: this.nextId++,
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim() || "General",
      totalCopies: copies,
      availableCopies: copies,
      borrowCount: 0,
    };
    this.books.push(b);
    this.indexBook(b);
    if (persist) this.save();
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
    if (b.title !== title) {
      this.deindexBook(b);
      b.title = title.trim();
      this.indexBook(b);
    }
    b.author = author.trim();
    b.genre = genre.trim() || "General";
    b.totalCopies = copies;
    b.availableCopies = copies - issued;
    this.save();
    return true;
  }

  // O(log n) binary search on a sorted-id index
  searchById(id: number): Book | null {
    const sorted = [...this.books].sort((a, b) => a.id - b.id);
    let lo = 0,
      hi = sorted.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].id === id) return sorted[mid];
      if (sorted[mid].id < id) lo = mid + 1;
      else hi = mid - 1;
    }
    return null;
  }

  searchByTitle(title: string): Book[] {
    const t = title.trim().toLowerCase();
    return this.books.filter((b) => b.title.toLowerCase() === t);
  }

  prefixSearch(prefix: string): Book[] {
    if (!prefix.trim()) return [];
    const ids = new Set(this.titleTrie.searchPrefix(prefix.trim()));
    return this.books.filter((b) => ids.has(b.id));
  }

  issueBook(id: number, user: string): { ok: boolean; reason?: string } {
    const b = this.books.find((x) => x.id === id);
    if (!b) return { ok: false, reason: "Book not found" };
    if (b.availableCopies <= 0) return { ok: false, reason: "No copies available" };
    if (!user.trim()) return { ok: false, reason: "User name required" };
    b.availableCopies--;
    b.borrowCount++;
    this.history.push({
      action: "ISSUE",
      bookId: b.id,
      bookTitle: b.title,
      user: user.trim(),
      timestamp: new Date().toISOString(),
    });
    this.save();
    return { ok: true };
  }

  returnBook(id: number, user: string): { ok: boolean; reason?: string } {
    const b = this.books.find((x) => x.id === id);
    if (!b) return { ok: false, reason: "Book not found" };
    if (b.availableCopies >= b.totalCopies) return { ok: false, reason: "No copies are issued" };
    if (!user.trim()) return { ok: false, reason: "User name required" };
    b.availableCopies++;
    this.history.push({
      action: "RETURN",
      bookId: b.id,
      bookTitle: b.title,
      user: user.trim(),
      timestamp: new Date().toISOString(),
    });
    this.save();
    return { ok: true };
  }

  topBorrowed(k: number): Book[] {
    const heap = new MaxHeap();
    for (const b of this.books) heap.push({ ...b });
    const out: Book[] = [];
    for (let i = 0; i < k && heap.size() > 0; i++) {
      out.push(heap.pop()!);
    }
    return out;
  }

  sorted(mode: "title" | "author" | "borrow" | "id"): Book[] {
    const copy = [...this.books];
    switch (mode) {
      case "title":
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      case "author":
        return copy.sort((a, b) => a.author.localeCompare(b.author));
      case "borrow":
        return copy.sort((a, b) => b.borrowCount - a.borrowCount);
      default:
        return copy.sort((a, b) => a.id - b.id);
    }
  }

  resetData() {
    this.books = [];
    this.history = [];
    this.nextId = 1;
    this.titleTrie = new Trie();
    this.seed();
    this.save();
  }
}
