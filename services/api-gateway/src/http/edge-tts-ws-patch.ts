import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

const nodeRequire = createRequire(__filename);

/**
 * edge-tts-universal talks to Edge TTS through isomorphic-ws. That package is
 * hoisted, so its require("ws") hits the workspace copy of ws 7. ws 7 delivers
 * text frames as strings and does not pass the isBinary flag the library
 * expects, which throws inside the socket handler and kills the gateway.
 * Swap the cached isomorphic-ws export for the ws 8 build shipped beside
 * edge-tts-universal before that library loads.
 */
function useEdgeTtsWebSocket(): void {
  let isoPath: string;
  try {
    isoPath = nodeRequire.resolve("isomorphic-ws");
  } catch {
    return;
  }

  const ws8Path = path.resolve(
    path.dirname(isoPath),
    "../edge-tts-universal/node_modules/ws",
  );
  if (!existsSync(path.join(ws8Path, "package.json"))) return;

  const ws8: unknown = nodeRequire(ws8Path);
  nodeRequire.cache[isoPath] = {
    id: isoPath,
    filename: isoPath,
    loaded: true,
    exports: ws8,
    children: [],
    paths: [],
    parent: null,
    path: "",
  } as unknown as NodeJS.Module;
}

useEdgeTtsWebSocket();
