export type TrieNode = {
  children: Map<string, TrieNode>;
  word?: string;
};

export function createTrie(words: Iterable<string>): TrieNode {
  const root: TrieNode = { children: new Map() };

  for (const word of words) {
    let node = root;
    for (const letter of word) {
      let child = node.children.get(letter);
      if (!child) {
        child = { children: new Map() };
        node.children.set(letter, child);
      }
      node = child;
    }
    node.word = word;
  }

  return root;
}
