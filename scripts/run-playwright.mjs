import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
const previewUrl = "http://127.0.0.1:4173/";
let previewOutput = "";
let previewError;

async function waitForPreview(child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (previewError) {
      throw new Error(`Vite preview could not start: ${previewError.message}`);
    }
    if (child.exitCode != null) {
      throw new Error(
        `Vite preview exited with code ${String(child.exitCode)}.${
          previewOutput ? `\n${previewOutput.trim()}` : ""
        }`,
      );
    }
    try {
      const response = await fetch(previewUrl, { signal: AbortSignal.timeout(1_000) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch {
      // The preview is still starting. Retry until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `Vite preview did not become available at ${previewUrl}${
      previewOutput ? `\n${previewOutput.trim()}` : ""
    }`,
  );
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode != null || child.signalCode != null) return;
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

async function stopPreview(child) {
  if (!child.pid || child.exitCode != null || child.signalCode != null) return;

  child.kill("SIGTERM");
  await waitForExit(child, 3_000);
  if (child.exitCode == null && child.signalCode == null) {
    child.kill("SIGKILL");
    await waitForExit(child, 2_000);
  }
}

const preview = spawn(
  process.execPath,
  [viteCli, "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  {
    cwd: root,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
preview.stdout.on("data", (chunk) => {
  previewOutput = `${previewOutput}${String(chunk)}`.slice(-8_000);
});
preview.stderr.on("data", (chunk) => {
  previewOutput = `${previewOutput}${String(chunk)}`.slice(-8_000);
});
preview.on("error", (error) => {
  previewError = error;
});

try {
  await waitForPreview(preview);
  const runner = spawnSync(process.execPath, [playwrightCli, "test", ...process.argv.slice(2)], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  process.exitCode = runner.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await stopPreview(preview);
}
