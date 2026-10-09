import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function findChromium(): Promise<string> {
  const candidates = [
    process.env.CHROMIUM_PATH?.trim(),
    "/repl/tools/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next known executable path.
    }
  }
  throw new Error("PDF_RENDERER_UNAVAILABLE");
}

export async function renderInvoiceHtmlToPdf(html: string): Promise<Buffer> {
  const executable = await findChromium();
  const workingDirectory = await mkdtemp(join(tmpdir(), "myla-invoice-"));
  const htmlPath = join(workingDirectory, "invoice.html");
  const pdfPath = join(workingDirectory, "invoice.pdf");

  try {
    await writeFile(htmlPath, html, { encoding: "utf8", mode: 0o600 });
    await new Promise<void>((resolve, reject) => {
      const child = spawn(executable, [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--no-pdf-header-footer",
        `--print-to-pdf=${pdfPath}`,
        pathToFileURL(htmlPath).href,
      ], { stdio: ["ignore", "ignore", "pipe"] });

      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("PDF_RENDER_TIMEOUT"));
      }, 30_000);

      child.stderr.on("data", (chunk: Buffer) => {
        if (stderr.length < 3000) stderr += chunk.toString().slice(0, 3000 - stderr.length);
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error(`PDF_RENDER_FAILED:${code ?? "unknown"}:${stderr.slice(-500)}`));
      });
    });

    const pdf = await readFile(pdfPath);
    if (pdf.length < 1000 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      throw new Error("PDF_RENDER_INVALID_OUTPUT");
    }
    return pdf;
  } finally {
    await rm(workingDirectory, { recursive: true, force: true }).catch(() => {});
  }
}
