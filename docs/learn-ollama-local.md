# AI local với Ollama (Mac)

App dùng Ollama trên máy thay Gemini / Apple Intelligence.

## Đã cài trên máy này

- App: `/Applications/Ollama.app`
- CLI: `~/homebrew/bin/ollama` (symlink)
- Model trả lời: `qwen3:14b` (từ 09/11/2026; `.env` đặt `LOCAL_AI_MODEL=qwen3:14b`). Mặc định của repo vẫn là `qwen2.5:7b`, nhưng model đó **không có** trên máy này: dùng nó thì mọi tính năng AI báo lỗi 404.
- Model embedding: `qwen3-embedding:0.6b` (~640 MB), dùng cho hỏi đáp ngữ pháp (RAG)
- API: `http://127.0.0.1:11434`

**Kiểm tra model gateway đang dùng có trên máy không** (lỗi hay gặp nhất):

```bash
docker exec edu-gateway printenv LOCAL_AI_MODEL LOCAL_AI_EMBED_MODEL
ollama list
```

**Model có chế độ "nghĩ" (qwen3, deepseek-r1):** mặc định model dùng hết `max_tokens` để suy nghĩ, phần trả lời thành **rỗng**. Gateway gửi `reasoning_effort: "none"` để tắt (biến `LOCAL_AI_REASONING`, đặt `default` để model tự quyết). Thử nhanh:

```bash
curl -s localhost:11434/v1/chat/completions -H 'Content-Type: application/json' \
  -d '{"model":"qwen3:14b","messages":[{"role":"user","content":"Xin chào"}],"max_tokens":200,"reasoning_effort":"none"}'
```

## Chạy mỗi lần học

```bash
open -a Ollama          # hoặc: npm run ai:ollama
# lần đầu / máy khác:
ollama pull qwen2.5:7b  # hoặc: npm run ai:ollama:pull (máy này dùng qwen3:14b)
ollama pull qwen3-embedding:0.6b   # cho hỏi đáp ngữ pháp
```

Kiểm tra:

```bash
curl -s http://127.0.0.1:11434/api/tags
curl -s http://127.0.0.1:11434/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:7b","messages":[{"role":"user","content":"Xin chào"}]}'
```

## Env

```bash
AI_PROVIDER=ollama
LOCAL_AI_BASE_URL=http://127.0.0.1:11434
LOCAL_AI_MODEL=qwen2.5:7b
```

- Web: `apps/nihongo-web/.env` → `/api/sentence-practice`
- Gateway: `services/.env` hoặc Docker compose (mặc định `host.docker.internal:11434`)

Đổi model: `ollama pull llama3.2` rồi `LOCAL_AI_MODEL=llama3.2`.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **8. Frontend web và desktop** — bài 5/6.

- Bài trước: [canvas-tools.md](./canvas-tools.md) — Luyện viết kanji, bảng trắng, worksheet, flashcard editor trên web
- **Bài tiếp: [learn-electron.md](./learn-electron.md)** — Electron: app desktop Nihongo

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
