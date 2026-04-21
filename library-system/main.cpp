#include "System.h"
#include <iostream>
#include <limits>
#include <string>
#include <sstream>

static void clearLine() {
    std::cin.clear();
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
}

static int readInt(const std::string& prompt) {
    while (true) {
        std::cout << prompt;
        int x;
        if (std::cin >> x) {
            clearLine();
            return x;
        }
        std::cout << "  Invalid number, try again.\n";
        clearLine();
    }
}

static std::string readLine(const std::string& prompt) {
    std::cout << prompt;
    std::string s;
    std::getline(std::cin, s);
    return s;
}

static std::string readNonEmpty(const std::string& prompt) {
    while (true) {
        std::string s = readLine(prompt);
        if (!s.empty()) return s;
        std::cout << "  Value cannot be empty.\n";
    }
}

static void printMenu() {
    std::cout << "\n";
    std::cout << "==================================================\n";
    std::cout << "         SMART LIBRARY MANAGEMENT SYSTEM          \n";
    std::cout << "==================================================\n";
    std::cout << " 1.  Add Book\n";
    std::cout << " 2.  Delete Book\n";
    std::cout << " 3.  Update Book\n";
    std::cout << " 4.  Search Book by ID (binary search)\n";
    std::cout << " 5.  Search Book by Title\n";
    std::cout << " 6.  Prefix Search (Trie)\n";
    std::cout << " 7.  Issue Book\n";
    std::cout << " 8.  Return Book\n";
    std::cout << " 9.  Display All Books\n";
    std::cout << "10.  Display Sorted (title/author/borrow)\n";
    std::cout << "11.  Top Borrowed Books (priority queue)\n";
    std::cout << "12.  User Activity History (stack)\n";
    std::cout << " 0.  Exit\n";
    std::cout << "--------------------------------------------------\n";
}

static void seed(LibrarySystem& lib) {
    lib.addBook("Introduction to Algorithms", "Cormen et al.", "CS", 5);
    lib.addBook("The Pragmatic Programmer", "Andy Hunt", "CS", 3);
    lib.addBook("Clean Code", "Robert C. Martin", "CS", 4);
    lib.addBook("Design Patterns", "Gamma et al.", "CS", 2);
    lib.addBook("The C++ Programming Language", "Bjarne Stroustrup", "CS", 6);
    lib.addBook("Atomic Habits", "James Clear", "Self-Help", 4);
    lib.addBook("Sapiens", "Yuval Noah Harari", "History", 3);
}

int main() {
    LibrarySystem lib;
    seed(lib);

    while (true) {
        printMenu();
        int choice = readInt("Enter choice: ");
        std::cout << "\n";

        switch (choice) {
            case 1: {
                std::string t = readNonEmpty("Title : ");
                std::string a = readNonEmpty("Author: ");
                std::string g = readLine("Genre : ");
                int c = readInt("Copies: ");
                if (c < 0) { std::cout << "Copies must be >= 0\n"; break; }
                if (lib.addBook(t, a, g, c)) std::cout << "Book added successfully.\n";
                else std::cout << "Failed to add book.\n";
                break;
            }
            case 2: {
                int id = readInt("Book ID to delete: ");
                std::cout << (lib.deleteBook(id) ? "Deleted.\n" : "Book not found.\n");
                break;
            }
            case 3: {
                int id = readInt("Book ID to update: ");
                const Book* b = lib.searchById(id);
                if (!b) { std::cout << "Book not found.\n"; break; }
                std::cout << "Current: " << b->title << " by " << b->author << "\n";
                std::string t = readNonEmpty("New Title : ");
                std::string a = readNonEmpty("New Author: ");
                std::string g = readLine("New Genre : ");
                int c = readInt("New Copies: ");
                if (lib.updateBook(id, t, a, g, c)) std::cout << "Updated.\n";
                else std::cout << "Update failed (check copies vs issued).\n";
                break;
            }
            case 4: {
                int id = readInt("Book ID: ");
                const Book* b = lib.searchById(id);
                if (!b) { std::cout << "Book not found.\n"; break; }
                std::cout << "Found: [" << b->id << "] " << b->title
                          << " by " << b->author
                          << " | genre: " << b->genre
                          << " | available " << b->availableCopies << "/" << b->totalCopies
                          << " | borrowed " << b->borrowCount << " times\n";
                break;
            }
            case 5: {
                std::string t = readNonEmpty("Title: ");
                auto results = lib.searchByTitle(t);
                if (results.empty()) std::cout << "No exact title match.\n";
                else {
                    std::cout << "Matches: " << results.size() << "\n";
                    for (auto* b : results)
                        std::cout << "  [" << b->id << "] " << b->title << " by " << b->author << "\n";
                }
                break;
            }
            case 6: {
                std::string p = readNonEmpty("Prefix: ");
                auto results = lib.prefixSearch(p);
                if (results.empty()) std::cout << "No matches.\n";
                else {
                    std::cout << "Found " << results.size() << " result(s):\n";
                    for (auto* b : results)
                        std::cout << "  [" << b->id << "] " << b->title << " by " << b->author << "\n";
                }
                break;
            }
            case 7: {
                int id = readInt("Book ID to issue: ");
                std::string u = readNonEmpty("User name: ");
                std::cout << (lib.issueBook(id, u) ? "Book issued.\n" : "Cannot issue (not found / unavailable).\n");
                break;
            }
            case 8: {
                int id = readInt("Book ID to return: ");
                std::string u = readNonEmpty("User name: ");
                std::cout << (lib.returnBook(id, u) ? "Book returned.\n" : "Cannot return (not found / no copies issued).\n");
                break;
            }
            case 9:
                lib.displayAll();
                break;
            case 10: {
                std::cout << "  1) by Title  2) by Author  3) by Borrow Count\n";
                int m = readInt("Sort mode: ");
                lib.displaySorted(m);
                break;
            }
            case 11: {
                int k = readInt("How many top books? ");
                if (k <= 0) { std::cout << "k must be > 0\n"; break; }
                lib.displayTopBorrowed(k);
                break;
            }
            case 12:
                lib.displayHistory();
                break;
            case 0:
                std::cout << "Goodbye!\n";
                return 0;
            default:
                std::cout << "Invalid choice.\n";
        }
    }
}
