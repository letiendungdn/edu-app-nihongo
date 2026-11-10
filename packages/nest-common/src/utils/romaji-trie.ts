/**
 * Cây tiền tố (Trie) tìm theo romaji. Cùng thuật toán với các app (Android RomajiTrie.kt, iOS, Flutter,
 * React Native) và bài 48 trong docs/interview-java-dsa.md. Ở backend dùng để content-service tìm
 * "kandō shimasu" khi người dùng gõ "kando" hoặc "kandou" (ILIKE của Postgres không bỏ dấu).
 *
 * - Kết quả: khóa ngắn trước, cùng độ dài theo bảng chữ cái.
 * - Một mục có thể nằm ở nhiều khóa ("kandō" lưu cả "kando" và "kandou"); search không trả trùng.
 */
interface TrieNode<T> {
  children?: Map<string, TrieNode<T>>;
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

const LONG_VOWELS: Record<string, string> = {
  ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'ou',
  â: 'aa', î: 'ii', û: 'uu', ê: 'ee', ô: 'ou',
};

/** Chữ thường, bỏ dấu (NFD tách dấu rồi lọc), bỏ mọi thứ không phải a–z. "Kandō shimasu" → "kandoshimasu". */
export function normalizeRomaji(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
}

/** Các khóa lưu một romaji: bỏ dấu ("kando") và nhân đôi nguyên âm dài ("kandou"). */
export function romajiKeys(romaji: string): string[] {
  const plain = normalizeRomaji(romaji);
  const doubled = normalizeRomaji([...romaji.toLowerCase()].map((c) => LONG_VOWELS[c] ?? c).join(''));
  return [...new Set([plain, doubled])].filter((k) => k.length > 0);
}

/** Chuỗi người dùng gõ có phải romaji (chữ Latin) không: có chữ a–z và không có kana, kanji. */
export function looksLikeRomaji(text: string): boolean {
  return /[a-z]/i.test(text) && !/[぀-ヿ㐀-鿿]/.test(text);
}
