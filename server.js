const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const START_PORT = Number(process.env.PORT || 4173);
const HOST = "127.0.0.1";
const ROOT = __dirname;
const DATABASE_FILE = path.join(ROOT, "data", "sheriff-oil.sqlite");
const LEGACY_RUNTIME_DATA_FILE = path.join(ROOT, "data", "runtime-content.json");
const ADMIN_EMAIL = "RigonDragusha@sheriff.petrol";
const ADMIN_EMAIL_HASH = "4936375698c50dac31058dbb98013792effbcecf7f11aa060cb3ddbf76f3e74d";
const ADMIN_PASSWORD_HASH = "996e1990f55742fdac09f1bc60f76b594fc77d1505f9f8dd65879a9e922cc9a5";

const DEFAULT_FUEL_PRICES = {
  currency: "\u20ac",
  diesel: "1.66",
  petrol: "1.40",
  adblue: "0.78",
  lastUpdated: "2026-04-29",
};

const DEFAULT_CONTACT = {
  address: "Zubq\u00eb 40650",
  phone: "044 517 400",
  email: "rigondragusha6@gmail.com",
  mapQuery: "Zubq\u00eb 40650, Kosovo",
  hours: {
    en: "Open 24/7",
    sq: "Hapur 24/7",
    sr: "Otvoreno 24/7",
  },
};

let database;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/api/content" && request.method === "GET") {
    sendJson(response, readRuntimeContent());
    return;
  }

  if (pathname === "/api/database-status" && request.method === "GET") {
    if (!isAuthorized(request)) {
      sendJson(response, { error: "Unauthorized" }, 401);
      return;
    }

    sendJson(response, getDatabaseStatus());
    return;
  }

  if (pathname === "/api/contact-messages" && request.method === "GET") {
    if (!isAuthorized(request)) {
      sendJson(response, { error: "Unauthorized" }, 401);
      return;
    }

    sendJson(response, { messages: getContactMessages() });
    return;
  }

  if (pathname === "/api/contact-messages" && request.method === "POST") {
    readJsonBody(request, (error, payload) => {
      if (error) {
        sendJson(response, { error: "Invalid JSON body" }, 400);
        return;
      }

      const contactMessage = sanitizeContactMessage(payload);

      if (!contactMessage) {
        sendJson(response, { error: "Name, email, and message are required" }, 400);
        return;
      }

      try {
        const savedMessage = saveContactMessage(contactMessage, request);
        sendJson(response, { ok: true, message: savedMessage }, 201);
      } catch (saveError) {
        sendJson(response, { error: "Unable to save contact message" }, 500);
      }
    });
    return;
  }

  if (pathname === "/api/fuel-prices" && request.method === "POST") {
    if (!isAuthorized(request)) {
      sendJson(response, { error: "Unauthorized" }, 401);
      return;
    }

    readJsonBody(request, (error, payload) => {
      if (error) {
        sendJson(response, { error: "Invalid JSON body" }, 400);
        return;
      }

      const fuelPrices = sanitizeFuelPrices(payload && payload.fuelPrices ? payload.fuelPrices : payload);

      if (!fuelPrices) {
        sendJson(response, { error: "Invalid fuel price payload" }, 400);
        return;
      }

      try {
        saveFuelPrices(fuelPrices);
        sendJson(response, readRuntimeContent());
      } catch (saveError) {
        sendJson(response, { error: "Unable to save fuel prices" }, 500);
      }
    });
    return;
  }

  if (isAdminPath(pathname) && !isAuthorized(request)) {
    response.writeHead(401, {
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": 'Basic realm="SHERIFF OIL Admin"',
    });
    response.end("Authentication required");
    return;
  }

  let filePath = path.join(ROOT, pathname === "/" ? "index.html" : pathname);

  if (pathname.endsWith("/")) {
    filePath = path.join(ROOT, pathname, "index.html");
  }

  const normalizedRoot = path.resolve(ROOT);
  const normalizedFile = path.resolve(filePath);

  if (!normalizedFile.startsWith(normalizedRoot)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(normalizedFile, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const contentType = MIME_TYPES[path.extname(normalizedFile).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    fs.createReadStream(normalizedFile).pipe(response);
  });
}

function readJsonBody(request, callback) {
  let body = "";

  request.on("data", (chunk) => {
    body += chunk;

    if (body.length > 1_000_000) {
      request.destroy();
    }
  });

  request.on("end", () => {
    if (!body.trim()) {
      callback(null, {});
      return;
    }

    try {
      callback(null, JSON.parse(body));
    } catch (error) {
      callback(error);
    }
  });

  request.on("error", (error) => callback(error));
}

function sendJson(response, payload, statusCode = 200) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function readRuntimeContent() {
  const db = getDatabase();
  const fuelRow = db
    .prepare("SELECT currency, diesel, petrol, adblue, last_updated AS lastUpdated FROM fuel_prices WHERE id = 1")
    .get();
  const contactRow = db
    .prepare(
      `SELECT address, phone, email, map_query AS mapQuery, hours_en AS hoursEn,
        hours_sq AS hoursSq, hours_sr AS hoursSr FROM site_contact WHERE id = 1`,
    )
    .get();

  return {
    fuelPrices: fuelRow || DEFAULT_FUEL_PRICES,
    contact: contactRow
      ? {
          address: contactRow.address,
          phone: contactRow.phone,
          email: contactRow.email,
          mapQuery: contactRow.mapQuery,
          hours: {
            en: contactRow.hoursEn,
            sq: contactRow.hoursSq,
            sr: contactRow.hoursSr,
          },
        }
      : DEFAULT_CONTACT,
  };
}

function sanitizeFuelPrices(value) {
  if (!value || typeof value !== "object") return null;

  const diesel = normalizePrice(value.diesel);
  const petrol = normalizePrice(value.petrol);
  const adblue = normalizePrice(value.adblue);
  const lastUpdated = typeof value.lastUpdated === "string" ? value.lastUpdated.trim() : "";

  if (!diesel || !petrol || !adblue || !/^\d{4}-\d{2}-\d{2}$/.test(lastUpdated)) {
    return null;
  }

  return {
    currency: "\u20ac",
    diesel,
    petrol,
    adblue,
    lastUpdated,
  };
}

function sanitizeContactMessage(value) {
  if (!value || typeof value !== "object") return null;

  const fullName = cleanText(value.fullName || value.name, 120);
  const phone = cleanText(value.phone, 60);
  const email = cleanText(value.email, 160);
  const message = cleanText(value.message, 2000);
  const page = cleanText(value.page, 80);

  if (!fullName || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return {
    fullName,
    phone,
    email,
    message,
    page,
  };
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizePrice(value) {
  if (value === undefined || value === null) return "";

  const text = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(text)) return "";

  return Number(text).toFixed(2);
}

function saveFuelPrices(fuelPrices) {
  const db = getDatabase();
  db.prepare(
    `UPDATE fuel_prices
      SET currency = ?, diesel = ?, petrol = ?, adblue = ?, last_updated = ?, updated_at = datetime('now')
      WHERE id = 1`,
  ).run(fuelPrices.currency, fuelPrices.diesel, fuelPrices.petrol, fuelPrices.adblue, fuelPrices.lastUpdated);
}

function saveContactMessage(message, request) {
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO contact_messages (full_name, phone, email, message, page, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      message.fullName,
      message.phone,
      message.email,
      message.message,
      message.page,
      request.headers["user-agent"] || "",
    );

  return {
    id: Number(result.lastInsertRowid),
    ...message,
    createdAt: new Date().toISOString(),
  };
}

function getContactMessages() {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT id, full_name AS fullName, phone, email, message, page,
        user_agent AS userAgent, created_at AS createdAt
      FROM contact_messages
      ORDER BY id DESC
      LIMIT 100`,
    )
    .all();
}

function getDatabaseStatus() {
  const db = getDatabase();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
  const counts = {};

  for (const table of tables) {
    counts[table] = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  }

  return {
    ok: true,
    database: DATABASE_FILE,
    tables,
    counts,
  };
}

function getDatabase() {
  if (!database) {
    database = openDatabase();
  }

  return database;
}

function openDatabase() {
  fs.mkdirSync(path.dirname(DATABASE_FILE), { recursive: true });
  const db = new DatabaseSync(DATABASE_FILE);

  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(
    `CREATE TABLE IF NOT EXISTS fuel_prices (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      currency TEXT NOT NULL DEFAULT '\u20ac',
      diesel TEXT NOT NULL,
      petrol TEXT NOT NULL,
      adblue TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS site_contact (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      map_query TEXT NOT NULL,
      hours_en TEXT NOT NULL,
      hours_sq TEXT NOT NULL,
      hours_sr TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      email_hash TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      page TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );

  seedDatabase(db);
  return db;
}

function seedDatabase(db) {
  const legacyContent = readLegacyRuntimeContent();
  const initialFuelPrices = sanitizeFuelPrices(legacyContent.fuelPrices) || DEFAULT_FUEL_PRICES;

  db.prepare(
    `INSERT INTO fuel_prices (id, currency, diesel, petrol, adblue, last_updated)
      VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING`,
  ).run(
    initialFuelPrices.currency,
    initialFuelPrices.diesel,
    initialFuelPrices.petrol,
    initialFuelPrices.adblue,
    initialFuelPrices.lastUpdated,
  );

  db.prepare(
    `INSERT INTO site_contact (id, address, phone, email, map_query, hours_en, hours_sq, hours_sr)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING`,
  ).run(
    DEFAULT_CONTACT.address,
    DEFAULT_CONTACT.phone,
    DEFAULT_CONTACT.email,
    DEFAULT_CONTACT.mapQuery,
    DEFAULT_CONTACT.hours.en,
    DEFAULT_CONTACT.hours.sq,
    DEFAULT_CONTACT.hours.sr,
  );

  db.prepare(
    `INSERT INTO admin_users (email, email_hash, password_hash, role)
      VALUES (?, ?, ?, 'owner')
      ON CONFLICT(email_hash) DO UPDATE SET
        email = excluded.email,
        password_hash = excluded.password_hash,
        role = excluded.role,
        updated_at = datetime('now')`,
  ).run(ADMIN_EMAIL, ADMIN_EMAIL_HASH, ADMIN_PASSWORD_HASH);
}

function readLegacyRuntimeContent() {
  try {
    if (!fs.existsSync(LEGACY_RUNTIME_DATA_FILE)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(LEGACY_RUNTIME_DATA_FILE, "utf8"));
  } catch (error) {
    return {};
  }
}

function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAuthorized(request) {
  if (isHashAuthorized(request)) {
    return true;
  }

  const header = request.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  const user = separator >= 0 ? decoded.slice(0, separator) : "";
  const password = separator >= 0 ? decoded.slice(separator + 1) : "";

  return timingSafeEqual(hashValue(user.trim().toLowerCase()), ADMIN_EMAIL_HASH) &&
    timingSafeEqual(hashValue(password), ADMIN_PASSWORD_HASH);
}

function isHashAuthorized(request) {
  const emailHash = request.headers["x-admin-email-hash"];
  const passwordHash = request.headers["x-admin-password-hash"];

  if (typeof emailHash !== "string" || typeof passwordHash !== "string") {
    return false;
  }

  return timingSafeEqual(emailHash, ADMIN_EMAIL_HASH) && timingSafeEqual(passwordHash, ADMIN_PASSWORD_HASH);
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function startServer(port) {
  const server = http.createServer(handleRequest);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < START_PORT + 20) {
      startServer(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, HOST, () => {
    console.log(`SHERIFF OIL local server running at http://${HOST}:${port}`);
    console.log(`Admin dashboard: http://${HOST}:${port}/admin/`);
    console.log(`SQLite database: ${DATABASE_FILE}`);
  });
}

startServer(START_PORT);
