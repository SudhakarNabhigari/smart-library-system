# Smart Library Management System (C++)

A menu-driven console application showcasing Advanced Data Structures
and Algorithms (ADSA) for managing a library catalog.

## Data Structures Used

| Structure        | Purpose                                              |
|------------------|------------------------------------------------------|
| `std::vector`    | Primary book record store                            |
| `std::stack`     | Issue/return activity history (LIFO)                 |
| `std::priority_queue` (heap) | Top-K most borrowed books                |
| **Trie**         | Prefix-based search over book titles (custom impl.)  |
| Sorted index + **Binary Search** | O(log n) lookup of book by ID            |
| `std::sort`      | Sort by title / author / borrow count                |

## Files

- `Book.h`           — Book record definition
- `Trie.h / Trie.cpp` — Custom Trie for prefix search
- `System.h / System.cpp` — Library operations and storage
- `main.cpp`         — Menu-driven console UI with input validation
- `Makefile`         — Build script

## Build & Run

```bash
cd library-system
make
./library
```

## Features

1. Add / Delete / Update books
2. Search by ID (binary search)
3. Search by Title (exact)
4. Prefix search (Trie)
5. Issue / Return books
6. Display all books / sorted views
7. Top-K most borrowed books (heap)
8. User activity history (stack)
9. Input validation everywhere
