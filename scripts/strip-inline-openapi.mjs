import fs from "fs";
import { execSync } from "child_process";

const files = execSync('rg -l "registerPath" src/app/api', { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  content = content.replace(/registry\.registerPath\(\{[\s\S]*?\}\);\s*\n?/g, "");
  content = content.replace(/import \{ registry \} from "@\/lib\/openapi";\n?/g, "");
  content = content.replace(/\.openapi\([^)]+\)/g, "");
  content = content.replace(/\n{3,}/g, "\n\n");
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log("cleaned:", file);
  }
}
