#!/usr/bin/env node
// Chạy đúng bản lệnh cho hệ điều hành đang dùng, để mọi `npm run …` trong package.json chạy được
// trên cả Windows lẫn macOS/Linux (trước đây db:backup, db:export-content, stripe:* chỉ chạy trên Windows).
//
//   node scripts/run-os.mjs script infra/backups/backup   # Windows: backup.ps1 — còn lại: backup.sh
//   node scripts/run-os.mjs stripe listen --forward-to …  # Stripe CLI đã cài (`stripe` trên PATH); chưa cài thì in cách cài
//   node scripts/run-os.mjs ollama                        # mở Ollama
//   node scripts/run-os.mjs desktop                       # mở app Electron (apps/nihongo-desktop)
//   node scripts/run-os.mjs python scripts/x.py --flag    # macOS/Linux chỉ có `python3`, Windows thường là `python`/`py`
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const [command, ...args] = process.argv.slice(2);

/** Chạy lệnh, chuyển nguyên output ra terminal, thoát cùng mã thoát. Không tìm thấy chương trình → in `hint`. */
function run(program, programArgs, hint) {
  const result = spawnSync(program, programArgs, { stdio: "inherit", cwd: ROOT });
  if (result.error?.code === "ENOENT") {
    console.error(`Không tìm thấy "${program}".${hint ? `\n${hint}` : ""}`);
    process.exit(127);
  }
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

function runScript(base) {
  if (!base) {
    console.error("Thiếu đường dẫn script, ví dụ: node scripts/run-os.mjs script infra/backups/backup");
    process.exit(2);
  }
  const file = join(ROOT, `${base}${isWindows ? ".ps1" : ".sh"}`);
  if (!existsSync(file)) {
    console.error(`Không có ${file} cho hệ điều hành này.`);
    process.exit(2);
  }
  if (isWindows) {
    run("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", file]);
  } else {
    run("bash", [file]);
  }
}

function runStripe(stripeArgs) {
  run("stripe", stripeArgs, [
    "Cài Stripe CLI:",
    "  macOS:   brew install stripe/stripe-cli/stripe",
    "  Windows: winget install Stripe.StripeCli",
    "  Linux:   https://docs.stripe.com/stripe-cli#install",
  ].join("\n"));
}

function openOllama() {
  if (process.platform === "darwin") {
    const opened = spawnSync("open", ["-a", "Ollama"], { stdio: "inherit" });
    if (opened.status !== 0) {
      console.error("Chưa cài Ollama: https://ollama.com/download");
      process.exit(1);
    }
  } else {
    // Windows chạy Ollama như ứng dụng nền khi đăng nhập; Linux chạy dịch vụ `ollama serve`.
    console.log(isWindows ? "Mở ứng dụng Ollama từ menu Start nếu nó chưa chạy." : "Chạy `ollama serve` ở một terminal khác nếu dịch vụ chưa chạy.");
  }
  console.log("Nếu chưa có model: npm run ai:ollama:pull");
}

function runDesktop(electronArgs) {
  const appDir = join(ROOT, "apps", "nihongo-desktop");
  let electron;
  try {
    // Gói `electron` export đường dẫn tới binary đúng của hệ điều hành (Electron.app, electron.exe…)
    electron = createRequire(join(appDir, "package.json"))("electron");
  } catch {
    console.error("Chưa cài Electron. Chạy: npm install --prefix apps/nihongo-desktop");
    process.exit(1);
  }
  // Terminal mở từ trong VS Code/Cursor (cũng là app Electron) có thể mang sẵn ELECTRON_RUN_AS_NODE=1:
  // Electron khi đó chạy như Node thường, không mở cửa sổ. Bỏ biến này trước khi khởi chạy.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(electron, [".", ...electronArgs], { stdio: "inherit", cwd: appDir, env });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

function runPython(pyArgs) {
  const candidates = isWindows ? ["python", "py"] : ["python3", "python"];
  for (const program of candidates) {
    const probe = spawnSync(program, ["--version"], { stdio: "ignore" });
    if (!probe.error && probe.status === 0) run(program, pyArgs);
  }
  console.error("Không tìm thấy Python 3. Cài tại https://www.python.org/downloads/");
  process.exit(127);
}

switch (command) {
  case "script":
    runScript(args[0]);
    break;
  case "stripe":
    runStripe(args);
    break;
  case "ollama":
    openOllama();
    break;
  case "desktop":
    runDesktop(args);
    break;
  case "python":
    runPython(args);
    break;
  default:
    console.error("Dùng: node scripts/run-os.mjs script <đường-dẫn-không-đuôi> | stripe <tham số…> | ollama | desktop | python <file.py> <tham số…>");
    process.exit(2);
}
