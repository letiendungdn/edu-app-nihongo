/** Hàm thuần xử lý response của gateway (tách riêng để test không cần Expo). */

/**
 * Gateway bọc MỌI response: `{ success: true, data, timestamp }`. Bản cũ không mở lớp này nên
 * `res.data.translation`, `res.data.answer`… luôn undefined (dịch trả nguyên câu gốc, gia sư AI
 * trả lời rỗng) và danh sách từ vựng luôn trống (`{ data: { data: [...] } }` bị coi như không có).
 */
export function unwrapEnvelope(body: unknown): unknown {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    const env = body as { success: unknown; data: unknown };
    if (env.success === true) return env.data;
  }
  return body;
}

export interface VocabListItem {
  id: number;
}

/** Trang từ vựng (`{ data: [...], total }` sau khi mở lớp bọc) hoặc mảng → danh sách. */
export function parseVocabList<T extends VocabListItem>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}
