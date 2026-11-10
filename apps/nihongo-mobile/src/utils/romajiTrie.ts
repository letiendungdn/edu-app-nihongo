/**
 * Cây tiền tố (Trie) để gợi ý từ vựng khi gõ romaji. Cùng thuật toán với Android (`RomajiTrie.kt`),
 * iOS (`RomajiTrie.swift`), Flutter (`romaji_trie.dart`) và bài 48 trong docs/interview-java-dsa.md.
 *
 * - Kết quả: khóa ngắn trước (gõ "ka" thì "ka" trước "kaban"), cùng độ dài theo bảng chữ cái.
 * - Một mục có thể nằm ở nhiều khóa ("kandō" lưu cả "kando" và "kandou"); search không trả trùng.
 */
interface TrieNode<T> {
  children?: Map<string, TrieNode<T>>; // tạo khi cần: phần lớn nút là lá
  items?: T[];
}

export class RomajiTrie<T> {
  private readonly root: TrieNode<T> = {};
  private nodes = 0;
  private items = 0;

  get nodeCount(): number {
    return this.nodes;
  }

  get itemCount(): number {
    return this.items;
  }

  insert(romaji: string, item: T): void {
    const keys = romajiKeys(romaji);
    if (keys.length === 0) return;
    this.items++;
    for (const key of keys) {
      let node = this.root;
      for (const c of key) {
        node.children ??= new Map();
        let next = node.children.get(c);
        if (!next) {
          next = {};
          node.children.set(c, next);
          this.nodes++;
        }
        node = next;
      }
      (node.items ??= []).push(item);
    }
  }

  search(prefix: string, limit = 30): T[] {
    const p = normalizeRomaji(prefix);
    if (p.length === 0 || limit <= 0) return [];
    let node: TrieNode<T> | undefined = this.root;
    for (const c of p) {
      node = node.children?.get(c);
      if (!node) return [];
    }
    // BFS theo tầng; Set giữ thứ tự chèn và loại trùng
    const result = new Set<T>();
    const queue: TrieNode<T>[] = [node];
    for (let head = 0; head < queue.length && result.size < limit; head++) {
      const n = queue[head];
      for (const item of n.items ?? []) {
        if (result.size >= limit) break;
        result.add(item);
      }
      if (n.children) {
        for (const key of [...n.children.keys()].sort()) queue.push(n.children.get(key)!);
      }
    }
    return [...result];
  }
}

// Không dùng String.prototype.normalize('NFD'): Hermes (engine JS của React Native) không phải bản
// nào cũng hỗ trợ. Bảng bỏ dấu cho nguyên âm hay gặp trong romaji.
const STRIP_MARKS: Record<string, string> = {
  ā: 'a', á: 'a', à: 'a', â: 'a', ä: 'a', ã: 'a',
  ī: 'i', í: 'i', ì: 'i', î: 'i', ï: 'i',
  ū: 'u', ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ē: 'e', é: 'e', è: 'e', ê: 'e', ë: 'e',
  ō: 'o', ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o',
};

const LONG_VOWELS: Record<string, string> = {
  ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'ou',
  â: 'aa', î: 'ii', û: 'uu', ê: 'ee', ô: 'ou',
};

/** Chữ thường, bỏ dấu (ō → o), bỏ mọi thứ không phải a–z. "Kandō shimasu" → "kandoshimasu". */
export function normalizeRomaji(text: string): string {
  return [...text.toLowerCase()].map((c) => STRIP_MARKS[c] ?? c).join('').replace(/[^a-z]/g, '');
}

/** Các khóa lưu một romaji: bỏ dấu ("kando") và nhân đôi nguyên âm dài ("kandou"). */
export function romajiKeys(romaji: string): string[] {
  const plain = normalizeRomaji(romaji);
  const doubled = normalizeRomaji([...romaji.toLowerCase()].map((c) => LONG_VOWELS[c] ?? c).join(''));
  return [...new Set([plain, doubled])].filter((k) => k.length > 0);
}
