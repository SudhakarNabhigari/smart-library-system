#include "System.h"
#include <algorithm>
#include <iostream>
#include <iomanip>
#include <queue>
#include <ctime>
#include <sstream>
#include <cctype>

LibrarySystem::LibrarySystem() : nextId(1) {}

std::string LibrarySystem::nowTimestamp() {
    std::time_t t = std::time(nullptr);
    std::tm tm{};
#if defined(_WIN32)
    localtime_s(&tm, &t);
#else
    localtime_r(&t, &tm);
#endif
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

int LibrarySystem::findIndexById(int id) const {
    for (size_t i = 0; i < books.size(); ++i) {
        if (books[i].id == id) return (int)i;
    }
    return -1;
}

void LibrarySystem::rebuildSortedIds() {
    sortedIds.clear();
    sortedIds.reserve(books.size());
    for (const auto& b : books) sortedIds.push_back(b.id);
    std::sort(sortedIds.begin(), sortedIds.end());
}

int LibrarySystem::binarySearchSortedIds(int id) const {
    int lo = 0, hi = (int)sortedIds.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (sortedIds[mid] == id) return mid;
        if (sortedIds[mid] < id) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

bool LibrarySystem::addBook(const std::string& title, const std::string& author,
                            const std::string& genre, int copies) {
    if (title.empty() || author.empty() || copies < 0) return false;
    Book b(nextId++, title, author, genre, copies);
    books.push_back(b);
    titleTrie.insert(title, b.id);
    // also index by each word in the title for richer prefix search
    std::istringstream iss(title);
    std::string word;
    while (iss >> word) {
        if (word != title) titleTrie.insert(word, b.id);
    }
    rebuildSortedIds();
    return true;
}

bool LibrarySystem::deleteBook(int id) {
    int idx = findIndexById(id);
    if (idx < 0) return false;
    Book b = books[idx];
    titleTrie.remove(b.title, b.id);
    std::istringstream iss(b.title);
    std::string word;
    while (iss >> word) {
        if (word != b.title) titleTrie.remove(word, b.id);
    }
    books.erase(books.begin() + idx);
    rebuildSortedIds();
    return true;
}

bool LibrarySystem::updateBook(int id, const std::string& title, const std::string& author,
                               const std::string& genre, int copies) {
    int idx = findIndexById(id);
    if (idx < 0) return false;
    Book& b = books[idx];
    if (b.title != title) {
        titleTrie.remove(b.title, b.id);
        std::istringstream issOld(b.title);
        std::string w;
        while (issOld >> w) if (w != b.title) titleTrie.remove(w, b.id);
        titleTrie.insert(title, b.id);
        std::istringstream issNew(title);
        while (issNew >> w) if (w != title) titleTrie.insert(w, b.id);
        b.title = title;
    }
    b.author = author;
    b.genre = genre;
    int issued = b.totalCopies - b.availableCopies;
    if (copies < issued) return false; // can't reduce below currently issued
    b.totalCopies = copies;
    b.availableCopies = copies - issued;
    return true;
}

const Book* LibrarySystem::searchById(int id) const {
    int pos = binarySearchSortedIds(id);
    if (pos < 0) return nullptr;
    int idx = findIndexById(id);
    if (idx < 0) return nullptr;
    return &books[idx];
}

std::vector<const Book*> LibrarySystem::searchByTitle(const std::string& title) const {
    std::vector<const Book*> out;
    std::string t = title;
    std::transform(t.begin(), t.end(), t.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    for (const auto& b : books) {
        std::string bt = b.title;
        std::transform(bt.begin(), bt.end(), bt.begin(),
                       [](unsigned char c) { return std::tolower(c); });
        if (bt == t) out.push_back(&b);
    }
    return out;
}

std::vector<const Book*> LibrarySystem::prefixSearch(const std::string& prefix) const {
    auto ids = titleTrie.searchPrefix(prefix);
    std::vector<const Book*> out;
    for (int id : ids) {
        int idx = findIndexById(id);
        if (idx >= 0) out.push_back(&books[idx]);
    }
    return out;
}

bool LibrarySystem::issueBook(int id, const std::string& user) {
    int idx = findIndexById(id);
    if (idx < 0) return false;
    Book& b = books[idx];
    if (b.availableCopies <= 0) return false;
    b.availableCopies--;
    b.borrowCount++;
    history.push({ActionType::ISSUE, b.id, b.title, user, nowTimestamp()});
    return true;
}

bool LibrarySystem::returnBook(int id, const std::string& user) {
    int idx = findIndexById(id);
    if (idx < 0) return false;
    Book& b = books[idx];
    if (b.availableCopies >= b.totalCopies) return false;
    b.availableCopies++;
    history.push({ActionType::RETURN, b.id, b.title, user, nowTimestamp()});
    return true;
}

void LibrarySystem::printHeader() {
    std::cout << std::left
              << std::setw(5)  << "ID"
              << std::setw(35) << "Title"
              << std::setw(25) << "Author"
              << std::setw(15) << "Genre"
              << std::setw(8)  << "Total"
              << std::setw(8)  << "Avail"
              << std::setw(8)  << "Borrow"
              << "\n";
    std::cout << std::string(104, '-') << "\n";
}

void LibrarySystem::printBookRow(const Book& b) {
    std::cout << std::left
              << std::setw(5)  << b.id
              << std::setw(35) << (b.title.size() > 33 ? b.title.substr(0, 32) + "…" : b.title)
              << std::setw(25) << (b.author.size() > 23 ? b.author.substr(0, 22) + "…" : b.author)
              << std::setw(15) << (b.genre.size() > 13 ? b.genre.substr(0, 12) + "…" : b.genre)
              << std::setw(8)  << b.totalCopies
              << std::setw(8)  << b.availableCopies
              << std::setw(8)  << b.borrowCount
              << "\n";
}

void LibrarySystem::displayAll() const {
    if (books.empty()) { std::cout << "  (no books in catalog)\n"; return; }
    printHeader();
    for (const auto& b : books) printBookRow(b);
}

void LibrarySystem::displaySorted(int mode) const {
    if (books.empty()) { std::cout << "  (no books in catalog)\n"; return; }
    std::vector<Book> copy = books;
    switch (mode) {
        case 1:
            std::sort(copy.begin(), copy.end(),
                      [](const Book& a, const Book& b) { return a.title < b.title; });
            break;
        case 2:
            std::sort(copy.begin(), copy.end(),
                      [](const Book& a, const Book& b) { return a.author < b.author; });
            break;
        case 3:
            std::sort(copy.begin(), copy.end(),
                      [](const Book& a, const Book& b) { return a.borrowCount > b.borrowCount; });
            break;
        default:
            std::sort(copy.begin(), copy.end(),
                      [](const Book& a, const Book& b) { return a.id < b.id; });
    }
    printHeader();
    for (const auto& b : copy) printBookRow(b);
}

void LibrarySystem::displayTopBorrowed(int k) const {
    if (books.empty()) { std::cout << "  (no books in catalog)\n"; return; }

    auto cmp = [](const Book* a, const Book* b) { return a->borrowCount < b->borrowCount; };
    std::priority_queue<const Book*, std::vector<const Book*>, decltype(cmp)> pq(cmp);
    for (const auto& b : books) pq.push(&b);

    std::cout << "Top " << k << " most borrowed books:\n";
    printHeader();
    int count = 0;
    while (!pq.empty() && count < k) {
        printBookRow(*pq.top());
        pq.pop();
        ++count;
    }
}

void LibrarySystem::displayHistory() const {
    if (history.empty()) { std::cout << "  (no activity yet)\n"; return; }
    std::stack<HistoryEntry> tmp = history;
    std::cout << std::left
              << std::setw(20) << "Time"
              << std::setw(10) << "Action"
              << std::setw(6)  << "ID"
              << std::setw(35) << "Title"
              << std::setw(15) << "User"
              << "\n";
    std::cout << std::string(86, '-') << "\n";
    while (!tmp.empty()) {
        const auto& e = tmp.top();
        std::cout << std::left
                  << std::setw(20) << e.timestamp
                  << std::setw(10) << (e.action == ActionType::ISSUE ? "ISSUE" : "RETURN")
                  << std::setw(6)  << e.bookId
                  << std::setw(35) << (e.bookTitle.size() > 33 ? e.bookTitle.substr(0, 32) + "…" : e.bookTitle)
                  << std::setw(15) << e.user
                  << "\n";
        tmp.pop();
    }
}
