#ifndef SYSTEM_H
#define SYSTEM_H

#include "Book.h"
#include "Trie.h"
#include <vector>
#include <stack>
#include <string>

enum class ActionType { ISSUE, RETURN };

struct HistoryEntry {
    ActionType action;
    int bookId;
    std::string bookTitle;
    std::string user;
    std::string timestamp;
};

class LibrarySystem {
public:
    LibrarySystem();

    // CRUD
    bool addBook(const std::string& title, const std::string& author,
                 const std::string& genre, int copies);
    bool deleteBook(int id);
    bool updateBook(int id, const std::string& title, const std::string& author,
                    const std::string& genre, int copies);

    // Search
    const Book* searchById(int id) const;             // O(log n) binary search on sorted index
    std::vector<const Book*> searchByTitle(const std::string& title) const;
    std::vector<const Book*> prefixSearch(const std::string& prefix) const;

    // Issue / return
    bool issueBook(int id, const std::string& user);
    bool returnBook(int id, const std::string& user);

    // Display
    void displayAll() const;
    void displaySorted(int mode) const; // 1=title 2=author 3=borrowCount desc
    void displayTopBorrowed(int k) const;
    void displayHistory() const;

    int totalBooks() const { return (int)books.size(); }

private:
    std::vector<Book> books;
    std::stack<HistoryEntry> history;
    Trie titleTrie;
    std::vector<int> sortedIds; // sorted by id, indexes into books vector positions via map
    int nextId;

    int findIndexById(int id) const;       // linear-safe lookup
    int binarySearchSortedIds(int id) const;
    void rebuildSortedIds();
    static std::string nowTimestamp();
    static void printHeader();
    static void printBookRow(const Book& b);
};

#endif
