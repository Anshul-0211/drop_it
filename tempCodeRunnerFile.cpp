#include <bits/stdc++.h>
using namespace std;

int minSupport = 2;

// Dataset
vector<vector<string>> transactions = {
    {"A","B","E"},
    {"B","D"},
    {"B","C"},
    {"A","B","D"},
    {"A","C"},
    {"B","C"},
    {"A","C"},
    {"A","B","C","E"},
    {"A","B","C"}
};

// Support count
int getSupport(vector<string> itemset) {
    int count = 0;
    for (auto t : transactions) {
        bool found = true;
        for (auto item : itemset) {
            if (find(t.begin(), t.end(), item) == t.end()) {
                found = false;
                break;
            }
        }
        if (found) count++;
    }
    return count;
}

// Check if subset exists in previous L
bool exists(vector<vector<string>> &L, vector<string> subset) {
    for (auto x : L) {
        if (x == subset) return true;
    }
    return false;
}

// Generate subsets of size k-1
vector<vector<string>> getSubsets(vector<string> itemset) {
    vector<vector<string>> subsets;
    for (int i = 0; i < itemset.size(); i++) {
        vector<string> temp;
        for (int j = 0; j < itemset.size(); j++) {
            if (i != j) temp.push_back(itemset[j]);
        }
        subsets.push_back(temp);
    }
    return subsets;
}

// Join + Prune
vector<vector<string>> joinAndPrune(vector<vector<string>> &L) {
    vector<vector<string>> candidates;

    for (int i = 0; i < L.size(); i++) {
        for (int j = i + 1; j < L.size(); j++) {

            set<string> s(L[i].begin(), L[i].end());
            s.insert(L[j].begin(), L[j].end());

            // only if size increases by 1
            if (s.size() == L[i].size() + 1) {
                vector<string> candidate(s.begin(), s.end());

                // 🔹 PRUNING STEP
                bool valid = true;
                vector<vector<string>> subsets = getSubsets(candidate);

                for (auto sub : subsets) {
                    if (!exists(L, sub)) {
                        valid = false;
                        break;
                    }
                }

                if (valid)
                    candidates.push_back(candidate);
            }
        }
    }
    return candidates;
}

// Print
void printItemsets(vector<vector<string>> itemsets) {
    for (auto s : itemsets) {
        cout << "{ ";
        for (auto x : s) cout << x << " ";
        cout << "} ";
    }
    cout << endl;
}

int main() {

    // L1
    map<string,int> freq;
    for (auto t : transactions)
        for (auto item : t)
            freq[item]++;

    vector<vector<string>> L;

    cout << "L1: ";
    for (auto p : freq) {
        if (p.second >= minSupport) {
            L.push_back({p.first});
            cout << "{ " << p.first << " } ";
        }
    }
    cout << endl;

    int k = 2;

    while (!L.empty()) {

        // Join + Prune
        vector<vector<string>> C = joinAndPrune(L);

        vector<vector<string>> newL;

        for (auto c : C) {
            int sup = getSupport(c);
            if (sup >= minSupport)
                newL.push_back(c);
        }

        if (newL.empty()) break;

        cout << "L" << k << ": ";
        printItemsets(newL);

        L = newL;
        k++;
    }

    return 0;
}