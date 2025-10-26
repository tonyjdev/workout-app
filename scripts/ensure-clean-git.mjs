// Falla si hay cambios sin commitear (incluye untracked)
import { execSync } from "node:child_process";

try {
  const out = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "inherit"] })
    .toString()
    .trim();
  if (out.length > 0) {
    console.error("\n✖ Git working directory not clean. Haz commit o stash antes de versionar.\n");
    process.exit(1);
  }
} catch (e) {
  console.error("✖ No parece un repo Git o Git no está disponible.");
  process.exit(1);
}
