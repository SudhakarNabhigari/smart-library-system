#ifndef TRIE_H
#define TRIE_H

#include <string>
#include <unordered_map>
#include <vector>
#include <memory>

class TrieNode {
public:
    std::unordered_map<char, std::unique_ptr<TrieNode>> children;
    std::vector<int> bookIds;
    bool isEnd;

    TrieNode() : isEnd(false) {}
};

class Trie {
public:
    Trie();
    void insert(const std::string& word, int bookId);
    void remove(const std::string& word, int bookId);
    std::vector<int> searchPrefix(const std::string& prefix) const;

private:
    std::unique_ptr<TrieNode> root;
    static std::string toLower(const std::string& s);
    void collectIds(const TrieNode* node, std::vector<int>& out) const;
};

#endif
