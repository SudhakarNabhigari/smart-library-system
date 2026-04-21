#include "Trie.h"
#include <algorithm>
#include <cctype>
#include <unordered_set>

Trie::Trie() : root(std::make_unique<TrieNode>()) {}

std::string Trie::toLower(const std::string& s) {
    std::string r = s;
    std::transform(r.begin(), r.end(), r.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return r;
}

void Trie::insert(const std::string& word, int bookId) {
    std::string w = toLower(word);
    TrieNode* node = root.get();
    for (char ch : w) {
        auto it = node->children.find(ch);
        if (it == node->children.end()) {
            auto newNode = std::make_unique<TrieNode>();
            TrieNode* raw = newNode.get();
            node->children.emplace(ch, std::move(newNode));
            node = raw;
        } else {
            node = it->second.get();
        }
        node->bookIds.push_back(bookId);
    }
    node->isEnd = true;
}

void Trie::remove(const std::string& word, int bookId) {
    std::string w = toLower(word);
    TrieNode* node = root.get();
    for (char ch : w) {
        auto it = node->children.find(ch);
        if (it == node->children.end()) return;
        node = it->second.get();
        auto& v = node->bookIds;
        v.erase(std::remove(v.begin(), v.end(), bookId), v.end());
    }
}

void Trie::collectIds(const TrieNode* node, std::vector<int>& out) const {
    if (!node) return;
    for (int id : node->bookIds) out.push_back(id);
}

std::vector<int> Trie::searchPrefix(const std::string& prefix) const {
    std::string p = toLower(prefix);
    const TrieNode* node = root.get();
    for (char ch : p) {
        auto it = node->children.find(ch);
        if (it == node->children.end()) return {};
        node = it->second.get();
    }
    std::vector<int> ids;
    collectIds(node, ids);
    std::unordered_set<int> seen;
    std::vector<int> unique;
    unique.reserve(ids.size());
    for (int id : ids) {
        if (seen.insert(id).second) unique.push_back(id);
    }
    return unique;
}
