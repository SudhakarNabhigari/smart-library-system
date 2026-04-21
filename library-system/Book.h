#ifndef BOOK_H
#define BOOK_H

#include <string>

struct Book {
    int id;
    std::string title;
    std::string author;
    std::string genre;
    int totalCopies;
    int availableCopies;
    int borrowCount;

    Book()
        : id(0), totalCopies(0), availableCopies(0), borrowCount(0) {}

    Book(int id_, const std::string& title_, const std::string& author_,
         const std::string& genre_, int copies)
        : id(id_), title(title_), author(author_), genre(genre_),
          totalCopies(copies), availableCopies(copies), borrowCount(0) {}
};

#endif
