# AI local với Ollama (Mac)

App dùng Ollama trên máy thay Gemini / Apple Intelligence.

## Đã cài trên máy này

- App: `/Applications/Ollama.app`
- CLI: `~/homebrew/bin/ollama` (symlink)
- Model: `qwen2.5:7b` (~4.7 GB)
- API: `http://127.0.0.1:11434`

## Chạy mỗi lần học

```bash
open -a Ollama          # hoặc: npm run ai:ollama
# lần đầu / máy khác:
ollama pull qwen2.5:7b  # hoặc: npm run ai:ollama:pull
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
