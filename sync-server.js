const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { execFile } = require("node:child_process");

const root = __dirname;
const workbookPath = "C:\\Users\\User\\OneDrive\\Desktop\\Ware house 200 last update 04-07-2026.xlsm";
let activeWorkbookPath = workbookPath;
const calculatorPath = "C:\\Users\\User\\OneDrive\\Desktop\\AHMED FOLDER\\calculator";
const additionalConverterPath = "C:\\Users\\User\\OneDrive\\Desktop\\lessons\\calculator\\60x6046crt.html";
const sourceReader = path.join(root, "read-sources.ps1");
const port = Number(process.env.PORT) || 8765;
const hiddenFiles = new Set(["read-sources.ps1", "write-sources.ps1", "sync-server.js", "start order desk.cmd"]);
const writerScript = path.join(root, "write-sources.ps1");
let sourceData = null;
let sourceError = "";
let goodSourceStamp = "";
let attemptedSourceStamp = "";
let refreshInProgress = null;

function getSourceStamp() {
  const files = [activeWorkbookPath, additionalConverterPath, ...fs.readdirSync(calculatorPath)
    .filter((name) => name.toLowerCase().endsWith(".html"))
    .map((name) => path.join(calculatorPath, name))];
  return files.map((file) => {
    const stat = fs.statSync(file);
    return `${file}:${stat.size}:${stat.mtimeMs}`;
  }).join("|");
}

function readSourceData() {
  return new Promise((resolve, reject) => {
    execFile("powershell.exe", [
      "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", sourceReader
    ], {
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, ORDER_DESK_WORKBOOK_PATH: activeWorkbookPath }
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error((stderr || error.message).trim()));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        if (!Array.isArray(data.products) || !data.converters || !data.gypsumConverters) {
          throw new Error("The source reader returned incomplete catalog or converter data.");
        }
        data.products = data.products.map((item) => ({
          product: Buffer.from(item.productBase64, "base64").toString("utf8"),
          unit: Buffer.from(item.unitBase64, "base64").toString("utf8"),
          quantities: (item.quantitiesBase64 || []).map((value) => Buffer.from(value, "base64").toString("utf8")),
          qtyItems: item.qtyItemsBase64.map((value) => Buffer.from(value, "base64").toString("utf8")),
          taken: (item.takenBase64 || []).map((value) => Buffer.from(value, "base64").toString("utf8")),
          rQuantities: item.rQuantitiesBase64.map((value) => Buffer.from(value, "base64").toString("utf8")),
          uomNs: item.uomNsBase64.map((value) => Buffer.from(value, "base64").toString("utf8")),
          statuses: (item.statusesBase64 || []).map((value) => Buffer.from(value, "base64").toString("utf8"))
        }));
        if (!data.products.length) {
          throw new Error("The source reader returned incomplete catalog or converter data.");
        }
        resolve(data);
      } catch (parseError) {
        reject(new Error(`Could not read the Excel and calculator data: ${parseError.message}`));
      }
    });
  });
}

async function refreshSources(force = false) {
  if (refreshInProgress) return refreshInProgress;
  const stamp = getSourceStamp();
  if (!force && stamp === goodSourceStamp) return;
  if (!force && stamp === attemptedSourceStamp && sourceError) return;
  attemptedSourceStamp = stamp;
  refreshInProgress = (async () => {
    try {
      const data = await readSourceData();
      const latestStamp = getSourceStamp();
      if (latestStamp !== stamp) {
        attemptedSourceStamp = "";
        return;
      }
      sourceData = {
        ...data,
        version: stamp,
        updatedAt: new Date().toISOString()
      };
      sourceError = "";
      goodSourceStamp = stamp;
      console.log(`Synced ${data.products.length.toLocaleString()} products and converter values from their original files.`);
    } catch (error) {
      sourceError = error.message || "Could not read the original Excel or converter files.";
      console.error(`Source sync failed: ${sourceError}`);
    } finally {
      refreshInProgress = null;
    }
  })();
  return refreshInProgress;
}

function sendJson(request, response, statusCode, value) {
  const body = JSON.stringify(value);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  };
  const requestOrigin = request.headers.origin;
  if (!requestOrigin || requestOrigin === "null"
    || requestOrigin === `http://127.0.0.1:${port}`
    || requestOrigin === `http://localhost:${port}`) {
    headers["Access-Control-Allow-Origin"] = requestOrigin || `http://127.0.0.1:${port}`;
    headers["Access-Control-Allow-Private-Network"] = "true";
  }
  response.writeHead(statusCode, headers);
  response.end(body);
}

function contentType(filePath) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
  })[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
  if (request.method === "OPTIONS" && ["/api/data", "/api/refresh", "/api/upload-workbook", "/api/write-workbook"].includes(requestUrl.pathname)) {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "null",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Private-Network": "true",
      "Vary": "Origin"
    });
    response.end();
    return;
  }
  if (requestUrl.pathname === "/api/data" && request.method === "GET") {
    try {
      await refreshSources();
      if (!sourceData) {
        sendJson(request, response, 503, { ok: false, error: sourceError || "Waiting for the source files to load." });
        return;
      }
      sendJson(request, response, 200, { ok: true, data: sourceData, warning: sourceError });
    } catch (error) {
      sendJson(request, response, 503, { ok: false, error: error.message });
    }
    return;
  }
  if (requestUrl.pathname === "/api/refresh" && request.method === "POST") {
    try {
      await refreshSources(true);
      if (!sourceData || sourceError) {
        sendJson(request, response, 503, { ok: false, error: sourceError || "Could not read the source files." });
        return;
      }
      sendJson(request, response, 200, { ok: true, data: sourceData });
    } catch (error) {
      sendJson(request, response, 503, { ok: false, error: error.message });
    }
    return;
  }
  if (requestUrl.pathname === "/api/write-workbook" && request.method === "POST") {
    const maxPayloadSize = 10 * 1024 * 1024;
    const chunks = [];
    let received = 0;
    request.on("data", (chunk) => {
      received += chunk.length;
      if (received > maxPayloadSize) {
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", async () => {
      const payloadPath = path.join(root, `.catalog-update-${process.pid}.json`);
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        const parsed = JSON.parse(body);
        await fs.promises.writeFile(payloadPath, JSON.stringify(parsed), "utf8");
        await new Promise((resolve, reject) => execFile("powershell.exe", [
          "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", writerScript
        ], {
          windowsHide: true,
          maxBuffer: 4 * 1024 * 1024,
          env: { ...process.env, ORDER_DESK_WORKBOOK_PATH: activeWorkbookPath, ORDER_DESK_CATALOG_PAYLOAD: payloadPath }
        }, (error, stdout, stderr) => error
          ? reject(new Error((stderr || error.message).trim()))
          : resolve(stdout)));
        await refreshSources(true);
        if (!sourceData || sourceError) throw new Error(sourceError || "The workbook was saved but could not be read back.");
        sendJson(request, response, 200, { ok: true, data: sourceData });
      } catch (error) {
        sendJson(request, response, 500, { ok: false, error: error.message || "Could not update the Excel workbook." });
      } finally {
        try { await fs.promises.unlink(payloadPath); } catch {}
      }
    });
    return;
  }
  if (requestUrl.pathname === "/api/upload-workbook" && request.method === "POST") {
    const maxWorkbookSize = 25 * 1024 * 1024;
    const contentLength = Number(request.headers["content-length"] || 0);
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > maxWorkbookSize) {
      sendJson(request, response, 413, { ok: false, error: "Choose an Excel workbook smaller than 25 MB." });
      return;
    }
    const chunks = [];
    let received = 0;
    let rejected = false;
    request.on("data", (chunk) => {
      received += chunk.length;
      if (received > maxWorkbookSize) {
        rejected = true;
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("error", (error) => {
      if (!rejected) sendJson(request, response, 400, { ok: false, error: `Could not receive the workbook: ${error.message}` });
    });
    request.on("end", async () => {
      if (rejected) return;
      const uploadDirectory = path.join(root, ".uploaded-sources");
      const uploadedPath = path.join(uploadDirectory, "warehouse-workbook.xlsm");
      const temporaryPath = `${uploadedPath}.uploading`;
      try {
        await fs.promises.mkdir(uploadDirectory, { recursive: true });
        await fs.promises.writeFile(temporaryPath, Buffer.concat(chunks));
        await fs.promises.rename(temporaryPath, uploadedPath);
        activeWorkbookPath = uploadedPath;
        await refreshSources(true);
        if (!sourceData || sourceError) {
          sendJson(request, response, 503, { ok: false, error: sourceError || "The uploaded workbook could not be read." });
          return;
        }
        sendJson(request, response, 200, { ok: true, data: sourceData });
      } catch (error) {
        try { await fs.promises.unlink(temporaryPath); } catch {}
        sendJson(request, response, 500, { ok: false, error: error.message || "Could not save the uploaded workbook." });
      }
    });
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400);
    response.end("Invalid URL.");
    return;
  }
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`) || hiddenFiles.has(path.basename(filePath).toLowerCase())) {
    response.writeHead(404);
    response.end("Not found.");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found." : "Could not read file.");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-cache"
    });
    response.end(request.method === "HEAD" ? undefined : content);
  });
});

server.listen(port, "127.0.0.1", () => {
  const apiAddress = `http://127.0.0.1:${port}/`;
  const appAddress = pathToFileURL(path.join(root, "index.html")).href;
  console.log(`SHAAFICI Order Desk live sync is running at ${apiAddress}`);
  execFile("cmd.exe", ["/c", "start", "", appAddress], { windowsHide: true }, (error) => {
    if (error) console.error(`Could not open the browser automatically: ${error.message}`);
  });
  refreshSources(true);
});

const sourceCheck = setInterval(() => {
  if (!sourceData || refreshInProgress) return;
  try {
    if (getSourceStamp() !== goodSourceStamp) refreshSources();
  } catch (error) {
    sourceError = error.message;
    console.error(`Could not check the source files: ${sourceError}`);
  }
}, 2000);

function shutdown() {
  clearInterval(sourceCheck);
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
