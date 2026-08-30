import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 12_000;
const prismaBinary = fileURLToPath(new URL("../node_modules/.bin/prisma", import.meta.url));

function runMigration() {
  return new Promise((resolve, reject) => {
    const child = spawn(prismaBinary, ["migrate", "deploy"], {
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const result = await runMigration();
  if (result.code === 0) process.exit(0);

  const lockTimedOut = /P1002|advisory lock|timed out trying to acquire/i.test(result.output);
  if (!lockTimedOut || attempt === MAX_ATTEMPTS) process.exit(result.code);

  console.warn(`Migration lock was busy (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
}
