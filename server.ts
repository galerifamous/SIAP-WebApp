import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Auto-copy .env.example to .env if missing
try {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.writeFileSync(envPath, fs.readFileSync(envExamplePath, 'utf8'), 'utf8');
    console.log("Auto-copied .env.example to .env");
  }
} catch (e) {
  console.warn("Failed to auto-copy .env.example to .env:", e);
}

// Load environment variables
dotenv.config();

let customConfigCache: any = null;

function cleanSupabaseUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();
  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  if (clean.endsWith('/rest/v1')) {
    clean = clean.slice(0, -8);
  }
  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

function getActiveSupabaseConfig(req?: any) {
  let supabaseUrl = "";
  let supabaseAnonKey = "";

  if (req) {
    const headerConfig = req.headers['x-supabase-config'];
    if (headerConfig) {
      try {
        const decoded = decodeURIComponent(headerConfig);
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) {
          supabaseUrl = parsed.supabaseUrl;
          supabaseAnonKey = parsed.supabaseAnonKey;
        }
      } catch (e) {
        console.warn("Failed to parse x-supabase-config header:", e);
      }
    }
  }

  if (!supabaseUrl && !supabaseAnonKey) {
    if (!customConfigCache) {
      try {
        const configPath = path.join(process.cwd(), 'supabase-config.json');
        const tmpConfigPath = path.join('/tmp', 'supabase-config.json');
        let loadedConfig: any = null;
        if (fs.existsSync(configPath)) {
          loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } else if (fs.existsSync(tmpConfigPath)) {
          loadedConfig = JSON.parse(fs.readFileSync(tmpConfigPath, 'utf8'));
        }
        if (loadedConfig && loadedConfig.supabaseUrl && loadedConfig.supabaseAnonKey) {
          customConfigCache = {
            supabaseUrl: loadedConfig.supabaseUrl.trim(),
            supabaseAnonKey: loadedConfig.supabaseAnonKey.trim()
          };
        }
      } catch (e) {
        console.warn("Failed to load custom config from file:", e);
      }
    }

    if (customConfigCache) {
      supabaseUrl = customConfigCache.supabaseUrl;
      supabaseAnonKey = customConfigCache.supabaseAnonKey;
    }
  }

  if (!supabaseUrl && !supabaseAnonKey) {
    let envConfig: any = {};
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const targetEnvFile = fs.existsSync(envPath) ? envPath : (fs.existsSync(envExamplePath) ? envExamplePath : null);
      if (targetEnvFile) {
        const content = fs.readFileSync(targetEnvFile, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              let value = parts.slice(1).join('=').trim();
              if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
              }
              if (key === 'SUPABASE_URL' || key === 'SUPABASE_ANON_KEY' || key === 'VITE_SUPABASE_URL' || key === 'VITE_SUPABASE_ANON_KEY') {
                envConfig[key] = value;
              }
            }
          }
        });
      }
    } catch (e) {
      console.warn("Failed to parse env file manually:", e);
    }

    supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || envConfig.SUPABASE_URL || envConfig.VITE_SUPABASE_URL || "";
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || envConfig.SUPABASE_ANON_KEY || envConfig.VITE_SUPABASE_ANON_KEY || "";
  }

  return {
    supabaseUrl: cleanSupabaseUrl(supabaseUrl),
    supabaseAnonKey: supabaseAnonKey.trim()
  };
}

function initSupabase(req?: any) {
  const config = getActiveSupabaseConfig(req);
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      return createClient(config.supabaseUrl, config.supabaseAnonKey);
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      return null;
    }
  }
  return null;
}

const app = express();
const PORT = 3000;

// Middleware to normalize Netlify/serverless request paths so they map cleanly to "/api/*" routes
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api');
  }
  next();
});

// Set large JSON limits to support base64 images (student photos, card signatures, stamps)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const baseDbPath = path.join(process.cwd(), 'database.json');
const dbPath = (process.env.VERCEL || process.env.NETLIFY)
  ? path.join('/tmp', 'database.json')
  : baseDbPath;

let cachedDb: any = null;

// Load database safely with .bak recovery support
const loadDb = () => {
  if (cachedDb) return cachedDb;

  const bakDbPath = dbPath + '.bak';

  if ((process.env.VERCEL || process.env.NETLIFY) && !fs.existsSync(dbPath) && fs.existsSync(baseDbPath)) {
    try {
      const fileContent = fs.readFileSync(baseDbPath, 'utf8');
      fs.writeFileSync(dbPath, fileContent, 'utf8');
    } catch (e) {
      console.error("Error copying base database to /tmp:", e);
    }
  }

  // Safe JSON file parsing helper
  const tryParseFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (!fileContent.trim()) return null;
        return JSON.parse(fileContent);
      } catch (e) {
        console.error(`Error parsing JSON from ${filePath}:`, e);
      }
    }
    return null;
  };

  // 1. Try reading the primary database file
  let parsed = tryParseFile(dbPath);
  if (parsed) {
    cachedDb = parsed;
    return parsed;
  }

  // 2. If primary failed, try reading the backup .bak file
  parsed = tryParseFile(bakDbPath);
  if (parsed) {
    console.log(`Database recovered from backup file (${bakDbPath}) successfully.`);
    // Restore the primary file
    try {
      fs.copyFileSync(bakDbPath, dbPath);
    } catch (e) {
      console.error("Failed to restore primary db file from backup:", e);
    }
    cachedDb = parsed;
    return parsed;
  }

  // 3. Fallback to base database if dbPath is different
  if (dbPath !== baseDbPath) {
    parsed = tryParseFile(baseDbPath);
    if (parsed) {
      cachedDb = parsed;
      return parsed;
    }
  }

  return null;
};

// Save database safely using atomic writes and maintaining a backup
const saveDb = (data: any) => {
  cachedDb = data;
  const bakDbPath = dbPath + '.bak';
  const tempPath = dbPath + '.tmp';

  try {
    // Clone the data to avoid mutating in-memory cache used by other parts of the application
    const dataCopy = JSON.parse(JSON.stringify(data));
    
    // Replace giant base64 image strings with tiny transparent placeholders for local storage.
    // This keeps database.json under 250KB and prevents truncation by platform file limits.
    const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    if (dataCopy.siap_card_signature_img && dataCopy.siap_card_signature_img.length > 50000) {
      console.log(`[saveDb] Reducing siap_card_signature_img in local file from ${dataCopy.siap_card_signature_img.length} chars to tiny placeholder`);
      dataCopy.siap_card_signature_img = tinyPng;
    }
    if (dataCopy.siap_card_stamp_img && dataCopy.siap_card_stamp_img.length > 50000) {
      console.log(`[saveDb] Reducing siap_card_stamp_img in local file from ${dataCopy.siap_card_stamp_img.length} chars to tiny placeholder`);
      dataCopy.siap_card_stamp_img = tinyPng;
    }

    const jsonStr = JSON.stringify(dataCopy, null, 2);
    // Write atomically to temp file
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    
    // Create backup of the existing good file before renaming the new one
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, bakDbPath);
      } catch (backupErr) {
        console.error("Error creating database backup file:", backupErr);
      }
    }

    // Rename temp file to target file (atomic operation on most systems)
    fs.renameSync(tempPath, dbPath);
    return true;
  } catch (e) {
    console.error("Error writing database file safely:", e);
    // Cleanup temp path if it exists
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return false;
  }
};

// --- SUPABASE UTILITIES ---
let lastInitError: string | null = null;



async function loadCollection(supabase: any, colName: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('siap_store')
      .select('id, data')
      .eq('collection', colName);

    if (error) {
      console.warn(`[Supabase loadCollection] Error loading ${colName}: ${error.message || JSON.stringify(error)}`);
      if (error.code === '42P01') {
        lastInitError = "Tabel 'siap_store' tidak ditemukan di database Supabase Anda. Silakan jalankan script SQL di panel bawah untuk membuat tabel.";
      } else {
        lastInitError = error.message || JSON.stringify(error);
      }
      return [];
    }

    if (!data) return [];

    const result = data.map((row: any) => {
      return { ...row.data, id: row.id };
    });

    if (colName === "students") {
      const fetchPhotoPromises = result.map(async (student: any) => {
        if (student.photoUrl === "__EXTERNAL_FIRESTORE_PHOTO__") {
          const studentId = String(student.nisn || student.id || "").trim();
          if (studentId) {
            student.photoUrl = await loadLargeField(supabase, "student_photos", studentId);
          }
        }
      });
      await Promise.all(fetchPhotoPromises);
    }

    return result;
  } catch (err: any) {
    console.error(`[Supabase loadCollection] Exception in ${colName}:`, err);
    lastInitError = err.message || String(err);
    return [];
  }
}

async function loadSettings(supabase: any): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('siap_store')
      .select('id, data')
      .eq('collection', 'settings');

    if (error) {
      console.warn(`[Supabase loadSettings] Error: ${error.message || JSON.stringify(error)}`);
      if (error.code === '42P01') {
        lastInitError = "Tabel 'siap_store' tidak ditemukan di database Supabase Anda. Silakan jalankan script SQL di panel bawah untuk membuat tabel.";
      } else {
        lastInitError = error.message || JSON.stringify(error);
      }
      return {};
    }

    const settings: any = {};
    if (data) {
      data.forEach((row: any) => {
        settings[row.id] = row.data;
      });
    }
    return settings;
  } catch (err: any) {
    console.error("[Supabase loadSettings] Exception:", err);
    lastInitError = err.message || String(err);
    return {};
  }
}

async function writeDocument(supabase: any, colName: string, id: string, item: any): Promise<void> {
  try {
    const { error } = await supabase
      .from('siap_store')
      .upsert({ collection: colName, id: id, data: item });

    if (error) {
      console.error(`[Supabase writeDocument] Error writing to ${colName}/${id}: ${error.message || JSON.stringify(error)}`);
      if (error.code === '42P01') {
        lastInitError = "Tabel 'siap_store' tidak ditemukan di database Supabase Anda. Silakan jalankan script SQL di panel bawah untuk membuat tabel.";
      } else {
        lastInitError = error.message || JSON.stringify(error);
      }
      throw error;
    }
  } catch (err: any) {
    console.error(`[Supabase writeDocument] Exception writing to ${colName}/${id}:`, err);
    throw err;
  }
}

async function deleteDocument(supabase: any, colName: string, id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('siap_store')
      .delete()
      .eq('collection', colName)
      .eq('id', id);

    if (error) {
      console.error(`[Supabase deleteDocument] Error deleting ${colName}/${id}:`, error);
      throw error;
    }
  } catch (err) {
    console.error(`[Supabase deleteDocument] Exception deleting ${colName}/${id}:`, err);
    throw err;
  }
}

async function saveLargeField(supabase: any, docPath: { col: string, id: string }, value: string) {
  try {
    const { col, id } = docPath;
    if (!value) {
      await deleteLargeField(supabase, col, id);
      await writeDocument(supabase, col, id, { type: "simple", value: "" });
      return;
    }

    await writeDocument(supabase, col, id, { type: "simple", value });
    console.log(`Successfully saved large field to ${col}/${id}.`);
  } catch (err) {
    console.error(`[Supabase saveLargeField] Error at ${docPath.col}/${docPath.id}:`, err);
  }
}

async function loadLargeField(supabase: any, col: string, id: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('siap_store')
      .select('data')
      .eq('collection', col)
      .eq('id', id)
      .single();

    if (error || !data) return "";
    const docData = data.data;
    if (docData && docData.type === "simple") {
      return docData.value || "";
    }
    return "";
  } catch (err) {
    console.error(`[Supabase loadLargeField] Error loading ${col}/${id}:`, err);
    return "";
  }
}

async function deleteLargeField(supabase: any, col: string, id: string) {
  try {
    await deleteDocument(supabase, col, id);
  } catch (err) {
    console.error(`[Supabase deleteLargeField] Error deleting ${col}/${id}:`, err);
  }
}



function objectsAreEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!objectsAreEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) return false;

  const keysA = Object.keys(a).filter(k => k !== "id" && k !== "_id" && k !== "timestamp");
  const keysB = Object.keys(b).filter(k => k !== "id" && k !== "_id" && k !== "timestamp");

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!objectsAreEqual(a[key], b[key])) return false;
  }
  return true;
}

async function syncCollection(supabase: any, colName: string, list: any[] | undefined, getId: (item: any) => string) {
  if (!list || !Array.isArray(list)) return;

  try {
    const existingItems = await loadCollection(supabase, colName);
    const existingMap = new Map<string, any>();
    const existingIds = new Set<string>();
    
    existingItems.forEach(item => {
      const id = getId(item);
      if (id !== undefined && id !== null && id !== '') {
        const idStr = String(id).trim();
        existingIds.add(idStr);
        existingMap.set(idStr, item);
      }
    });

    const currentIds = new Set(list.map(item => {
      const id = getId(item);
      return id !== undefined && id !== null ? String(id).trim() : '';
    }).filter(idStr => idStr !== ''));

    // Process photo conversions concurrently first if students
    if (colName === "students") {
      await Promise.all(list.map(async (item) => {
        const id = getId(item);
        if (id !== undefined && id !== null && id !== '') {
          const idStr = String(id).trim();
          if (item.photoUrl && item.photoUrl.length > 200000) {
            await saveLargeField(supabase, { col: "student_photos", id: idStr }, item.photoUrl);
          }
        }
      }));
    }

    // Build the bulk upsert array
    const upsertRows: any[] = [];
    list.forEach(item => {
      const id = getId(item);
      if (id === undefined || id === null || id === '') return;
      const idStr = String(id).trim();

      let finalItem = { ...item };
      if (colName === "students" && item.photoUrl && item.photoUrl.length > 200000) {
        finalItem.photoUrl = "__EXTERNAL_FIRESTORE_PHOTO__";
      }

      const existingItem = existingMap.get(idStr);
      if (existingItem && objectsAreEqual(finalItem, existingItem)) {
        return;
      }

      upsertRows.push({
        collection: colName,
        id: idStr,
        data: finalItem,
        updated_at: new Date().toISOString()
      });
    });

    // Execute bulk upsert in a single highly-efficient request
    if (upsertRows.length > 0) {
      console.log(`[Supabase Sync] Bulk upserting ${upsertRows.length} rows to '${colName}'...`);
      const { error } = await supabase
        .from('siap_store')
        .upsert(upsertRows);
      if (error) {
        console.error(`[Supabase syncCollection] Bulk upsert error for ${colName}:`, error);
        throw error;
      }
    }

    // Process bulk deletes in a single highly-efficient request
    const deleteIds = Array.from(existingIds).filter(id => !currentIds.has(id));
    if (deleteIds.length > 0) {
      console.log(`[Supabase Sync] Bulk deleting ${deleteIds.length} rows from '${colName}'...`);
      const { error } = await supabase
        .from('siap_store')
        .delete()
        .eq('collection', colName)
        .in('id', deleteIds);
      if (error) {
        console.error(`[Supabase syncCollection] Bulk delete error for ${colName}:`, error);
        throw error;
      }
      if (colName === "students") {
        await Promise.all(deleteIds.map(id => deleteLargeField(supabase, "student_photos", id)));
      }
    }
  } catch (err) {
    console.error(`Error syncing collection ${colName}:`, err);
  }
}

async function saveToSupabase(supabase: any, payload: any) {
  try {
    // Run all collection sync operations in parallel
    await Promise.all([
      syncCollection(supabase, "students", payload.siap_students, item => item.nisn),
      syncCollection(supabase, "teachers", payload.siap_teachers, item => item.nuptk),
      syncCollection(supabase, "attendance", payload.siap_attendance, item => item.id),
      syncCollection(supabase, "grades", payload.siap_grades, item => item.id),
      syncCollection(supabase, "cases", payload.siap_cases, item => item.id),
      syncCollection(supabase, "achievements", payload.siap_achievements, item => item.id),
      syncCollection(supabase, "emails", payload.siap_emails, item => item.id),
      syncCollection(supabase, "holidays", payload.siap_holidays, item => item.id),
      syncCollection(supabase, "class_staffs", payload.siap_class_staffs, item => item.classId),
    ]);

    const existingSettings = await loadSettings(supabase).catch(() => ({}));

    const settingsPromises: Promise<any>[] = [];

    if (payload.siap_academic) {
      const existingAcademic = existingSettings["academic"];
      if (!existingAcademic || !objectsAreEqual(payload.siap_academic, existingAcademic)) {
        settingsPromises.push(writeDocument(supabase, "settings", "academic", payload.siap_academic));
      }
    }
    if (payload.siap_system) {
      const systemDoc = { ...payload.siap_system };
      const systemLogo = systemDoc.logoUrl || "";
      if (systemLogo && systemLogo !== "__EXTERNAL_FIRESTORE_LOGO__") {
        settingsPromises.push(
          saveLargeField(supabase, { col: "settings", id: "logo" }, systemLogo)
            .then(() => {
              systemDoc.logoUrl = "__EXTERNAL_FIRESTORE_LOGO__";
              return writeDocument(supabase, "settings", "system", systemDoc);
            })
        );
      } else {
        const existingSystem = existingSettings["system"];
        if (!existingSystem || !objectsAreEqual(systemDoc, existingSystem)) {
          settingsPromises.push(writeDocument(supabase, "settings", "system", systemDoc));
        }
      }
    }
    const metaDoc = { siap_gas_url: payload.siap_gas_url || "" };
    const existingMeta = existingSettings["meta"];
    if (!existingMeta || !objectsAreEqual(metaDoc, existingMeta)) {
      settingsPromises.push(writeDocument(supabase, "settings", "meta", metaDoc));
    }

    const currentSignature = payload.siap_card_signature_img || "";
    const existingSignature = await loadLargeField(supabase, "settings", "signature").catch(() => "");
    if (currentSignature !== existingSignature) {
      settingsPromises.push(saveLargeField(supabase, { col: "settings", id: "signature" }, currentSignature));
    }

    const currentStamp = payload.siap_card_stamp_img || "";
    const existingStamp = await loadLargeField(supabase, "settings", "stamp").catch(() => "");
    if (currentStamp !== existingStamp) {
      settingsPromises.push(saveLargeField(supabase, { col: "settings", id: "stamp" }, currentStamp));
    }

    if (settingsPromises.length > 0) {
      await Promise.all(settingsPromises);
    }
  } catch (err) {
    console.error("Error saving state to Supabase:", err);
  }
}

// API: Load State
app.get("/api/load", async (req, res) => {
  const supabase = initSupabase(req);
  if (supabase) {
    try {
      console.log("Loading database from Supabase...");
      
      // Safety check: verify connectivity and table existence
      const { error: tableCheckError } = await supabase.from('siap_store').select('id').limit(1);
      if (tableCheckError) {
        throw new Error(`Koneksi Supabase gagal atau tabel 'siap_store' belum dibuat: ${tableCheckError.message} (code: ${tableCheckError.code})`);
      }

      const [
        students,
        teachers,
        attendance,
        grades,
        cases,
        achievements,
        emails,
        holidays,
        classStaffs,
        settingsMap,
        signatureImg,
        stampImg,
        logoImg
      ] = await Promise.all([
        loadCollection(supabase, "students"),
        loadCollection(supabase, "teachers"),
        loadCollection(supabase, "attendance"),
        loadCollection(supabase, "grades"),
        loadCollection(supabase, "cases"),
        loadCollection(supabase, "achievements"),
        loadCollection(supabase, "emails"),
        loadCollection(supabase, "holidays"),
        loadCollection(supabase, "class_staffs"),
        loadSettings(supabase),
        loadLargeField(supabase, "settings", "signature"),
        loadLargeField(supabase, "settings", "stamp"),
        loadLargeField(supabase, "settings", "logo")
      ]);

      if (students.length > 0 || teachers.length > 0) {
        const system = settingsMap["system"] || null;
        if (system) {
          if (logoImg) {
            system.logoUrl = logoImg;
          } else if (system.logoUrl === "__EXTERNAL_FIRESTORE_LOGO__") {
            system.logoUrl = "";
          }
        }

        const gasUrlLoaded = settingsMap["meta"]?.siap_gas_url || "";
        cachedGasUrl = gasUrlLoaded;

        const assembledData = {
          siap_students: students,
          siap_teachers: teachers,
          siap_attendance: attendance,
          siap_grades: grades,
          siap_cases: cases,
          siap_achievements: achievements,
          siap_emails: emails,
          siap_holidays: holidays,
          siap_class_staffs: classStaffs,
          siap_academic: settingsMap["academic"] || null,
          siap_system: system,
          siap_gas_url: gasUrlLoaded,
          siap_card_signature_img: signatureImg,
          siap_card_stamp_img: stampImg
        };
        console.log("Database successfully loaded from Supabase.");
        return res.json({ success: true, data: assembledData, storageMode: "supabase" });
      } else {
        console.log("Supabase is empty. Returning empty status so client can seed.");
        return res.json({ success: true, data: null, storageMode: "supabase-empty" });
      }
    } catch (err: any) {
      console.error("Failed to load from Supabase:", err);
      return res.json({
        success: false,
        message: `Gagal memuat dari Supabase: ${err.message || err}`,
        storageMode: "supabase-error"
      });
    }
  }

  const data = loadDb();
  if (data) {
    let mode = "local";
    if (supabase) {
      mode = "supabase-seeding";
      try {
        console.log("Auto-seeding local database data to Supabase...");
        saveToSupabase(supabase, data).then(() => {
          console.log("Auto-seeding complete!");
        }).catch(err => {
          console.error("Auto-seeding failed:", err);
        });
      } catch (err) {
        console.error("Error launching auto-seed:", err);
      }
    }
    res.json({ success: true, data, storageMode: mode });
  } else {
    res.json({ success: false, message: "No data stored yet on server.", storageMode: supabase ? "supabase-empty" : "local" });
  }
});

// API: Check Database & Supabase connection status
app.get("/api/status", async (req, res) => {
  const supabase = initSupabase(req);
  const config = getActiveSupabaseConfig(req);
  const envUrl = config.supabaseUrl;
  const envKey = config.supabaseAnonKey;
  
  const detectedEnvKeys: Record<string, { exists: boolean, length: number }> = {};
  const supabaseVars = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY"
  ];

  // Try to find the values from process.env, local config or env file
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const targetEnvFile = fs.existsSync(envPath) ? envPath : (fs.existsSync(envExamplePath) ? envExamplePath : null);
  let envFileVars: Record<string, string> = {};
  if (targetEnvFile) {
    try {
      const content = fs.readFileSync(targetEnvFile, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.substring(1, value.length - 1);
            }
            envFileVars[key] = value;
          }
        }
      });
    } catch (e) {}
  }
  
  supabaseVars.forEach(key => {
    const val = process.env[key] || envFileVars[key];
    detectedEnvKeys[key] = {
      exists: typeof val !== "undefined" && val !== "",
      length: val ? String(val).length : 0
    };
  });

  let tableExists = false;
  if (supabase) {
    try {
      const { error } = await supabase.from('siap_store').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          lastInitError = "Tabel 'siap_store' tidak ditemukan di database Supabase Anda. Silakan jalankan script SQL di panel bawah untuk membuat tabel.";
          tableExists = false;
        } else {
          lastInitError = error.message || JSON.stringify(error);
          tableExists = false;
        }
      } else {
        tableExists = true;
      }
    } catch (err: any) {
      lastInitError = err.message || String(err);
      tableExists = false;
    }
  }

  res.json({
    supabaseInitialized: !!supabase,
    usingEnvVariables: !!(envUrl && envKey),
    supabaseUrl: envUrl || null,
    storageMode: supabase ? "supabase" : "local_file_only",
    vercelEnv: !!(process.env.VERCEL || process.env.NETLIFY),
    envKeysDetected: detectedEnvKeys,
    lastInitError: lastInitError,
    tableExists: tableExists
  });
});

// Cache the Google Apps Script URL in-memory to prevent blocking Supabase queries during save operations
let cachedGasUrl: string | null = null;

// Background Sync Queue for Supabase
let syncQueue: { supabase: any; payload: any }[] = [];
let isSyncing = false;
let lastSyncedPayloadString = "";

async function processSyncQueue() {
  if (isSyncing || syncQueue.length === 0) return;
  isSyncing = true;

  while (syncQueue.length > 0) {
    const task = syncQueue[syncQueue.length - 1];
    syncQueue = []; // Clear queue to only process the latest state

    console.log(`[Background Sync] Starting Supabase sync...`);
    try {
      await saveToSupabase(task.supabase, task.payload);
      console.log(`[Background Sync] Supabase sync completed successfully.`);
    } catch (err) {
      console.error(`[Background Sync] Supabase sync failed:`, err);
    }
  }

  isSyncing = false;
}

function queueSupabaseSync(supabase: any, payload: any) {
  try {
    const payloadStr = JSON.stringify({
      siap_students: payload.siap_students,
      siap_teachers: payload.siap_teachers,
      siap_attendance: payload.siap_attendance,
      siap_grades: payload.siap_grades,
      siap_cases: payload.siap_cases,
      siap_achievements: payload.siap_achievements,
      siap_emails: payload.siap_emails,
      siap_academic: payload.siap_academic,
      siap_system: payload.siap_system,
      siap_holidays: payload.siap_holidays,
      siap_class_staffs: payload.siap_class_staffs,
      siap_gas_url: payload.siap_gas_url,
      siap_card_signature_img: payload.siap_card_signature_img,
      siap_card_stamp_img: payload.siap_card_stamp_img
    });
    if (payloadStr === lastSyncedPayloadString) {
      console.log("[Background Sync] Payload is identical. Skipping Supabase sync.");
      return;
    }
    lastSyncedPayloadString = payloadStr;
  } catch (err) {
    console.error("[Background Sync] Failed to stringify payload for cache comparison:", err);
  }

  syncQueue.push({ supabase, payload });
  processSyncQueue().catch(err => {
    console.error("[Background Sync] Queue processing error:", err);
  });
}

// API: Save State
app.post("/api/save", async (req, res) => {
  const payload = req.body;
  const current = loadDb() || {};
  const updated = { ...current, ...payload };
  const success = saveDb(updated);

  const supabase = initSupabase(req);
  if (supabase) {
    console.log("[Direct Sync] Queuing Supabase sync in background...");
    queueSupabaseSync(supabase, payload);
  }

  if (payload.siap_gas_url) {
    cachedGasUrl = payload.siap_gas_url;
  }

  // Automatic Realtime Sync to Google Apps Script (Spreadsheet) in background
  let gasUrl = payload.siap_gas_url || current.siap_gas_url || "";
  if (!gasUrl) {
    if (cachedGasUrl !== null) {
      gasUrl = cachedGasUrl;
    } else if (supabase) {
      try {
        const settingsMap = await loadSettings(supabase).catch(() => ({}));
        cachedGasUrl = settingsMap["meta"]?.siap_gas_url || "";
        gasUrl = cachedGasUrl;
      } catch (err) {}
    }
  }

  if (gasUrl) {
    // Perform an asynchronous, non-blocking background fetch to GAS
    // to keep Google Sheet in sync without blocking the API response
    const gasPayload = {
      siap_students: payload.siap_students,
      siap_teachers: payload.siap_teachers,
      siap_attendance: payload.siap_attendance,
      siap_grades: payload.siap_grades,
      siap_cases: payload.siap_cases,
      siap_achievements: payload.siap_achievements,
      siap_emails: payload.siap_emails,
      siap_academic: payload.siap_academic,
      siap_system: payload.siap_system,
      siap_holidays: payload.siap_holidays,
      siap_class_staffs: payload.siap_class_staffs,
    };

    console.log(`[Auto GAS Sync] Auto-syncing updated data to Google Sheets via ${gasUrl}...`);
    fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(gasPayload),
    })
    .then(async (gasRes) => {
      const text = await gasRes.text();
      console.log("[Auto GAS Sync] Response from GAS:", text.substring(0, 200));
    })
    .catch((gasErr) => {
      console.error("[Auto GAS Sync] Error auto-syncing to GAS:", gasErr);
    });
  }

  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, message: "Failed to write database file." });
  }
});

// API: Save custom Configuration
app.post("/api/save-firebase-config", async (req, res) => {
  const { config } = req.body;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
    return res.status(400).json({ success: false, message: "Konfigurasi tidak lengkap. Pastikan ada supabaseUrl dan supabaseAnonKey." });
  }

  try {
    const configPath = path.join(process.cwd(), 'supabase-config.json');
    const newConfig = {
      supabaseUrl: config.supabaseUrl.trim(),
      supabaseAnonKey: config.supabaseAnonKey.trim()
    };

    try {
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");
    } catch (e) {
      console.warn("Failed to write config, trying /tmp fallback:", e);
    }
    try {
      const tmpConfigPath = path.join('/tmp', 'supabase-config.json');
      fs.writeFileSync(tmpConfigPath, JSON.stringify(newConfig, null, 2), "utf8");
    } catch (e) {}

    customConfigCache = { ...newConfig };

    console.log("Custom Supabase Config saved successfully.");
    res.json({ success: true, message: "Konfigurasi Supabase berhasil disimpan!" });
  } catch (err: any) {
    console.error("Failed to save custom config:", err);
    res.status(500).json({ success: false, message: "Gagal menyimpan konfigurasi: " + err.message });
  }
});

// API: Get Supabase Configuration for Client-Side Handshake/Subscriptions
app.get("/api/supabase-config", (req, res) => {
  const config = getActiveSupabaseConfig(req);
  if (config.supabaseUrl && config.supabaseAnonKey) {
    res.json({
      success: true,
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey
    });
  } else {
    res.json({
      success: false,
      message: "Supabase is not configured on the server."
    });
  }
});

// API: Save GAS URL directly
app.post("/api/save-gas-url", async (req, res) => {
  const { gasUrl } = req.body;
  const current = loadDb() || {};
  current.siap_gas_url = gasUrl;
  const success = saveDb(current);

  const supabase = initSupabase(req);
  if (supabase) {
    try {
      console.log("Saving GAS URL to Supabase...");
      await writeDocument(supabase, "settings", "meta", { siap_gas_url: gasUrl });
      console.log("GAS URL successfully synced to Supabase.");
    } catch (err) {
      console.error("Failed to sync GAS URL to Supabase:", err);
    }
  }

  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, message: "Failed to save gasUrl." });
  }
});

// API: Sync/Backup State to GAS URL (Server-side proxy to bypass CORS)
app.post("/api/sync-to-gas", async (req, res) => {
  const backupObj = req.body;

  let gasUrl = "";
  const supabase = initSupabase(req);
  if (supabase) {
    try {
      const settingsMap = await loadSettings(supabase);
      gasUrl = settingsMap["meta"]?.siap_gas_url || "";
    } catch (err) {
      console.error("[sync-to-gas] Failed to load settings from Supabase:", err);
    }
  }

  if (!gasUrl) {
    try {
      const current = loadDb() || {};
      gasUrl = current.siap_gas_url || "";
    } catch (err) {}
  }

  if (!gasUrl) {
    return res.status(400).json({ success: false, message: "URL Google Apps Script belum dikonfigurasi." });
  }

  try {
    console.log(`[sync-to-gas] Proxying backup upload to GAS URL: ${gasUrl}`);
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(backupObj),
    });

    const responseText = await response.text();
    let responseJson: any = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      responseJson = { success: true, message: responseText };
    }

    if (response.ok && (responseJson.success || responseText.includes('"success":true'))) {
      res.json({
        success: true,
        message: responseJson.message || "Data berhasil disinkronkan ke Google Sheets."
      });
    } else {
      res.status(500).json({
        success: false,
        message: responseJson.message || responseText || "Gagal sinkronisasi via Google Apps Script."
      });
    }
  } catch (err: any) {
    console.error("Failed to sync to GAS URL:", err);
    res.status(500).json({
      success: false,
      message: `Gagal koneksi ke Google Apps Script: ${err.message}`
    });
  }
});

// API: Load/Restore State from GAS URL (Server-side proxy to bypass CORS)
app.get("/api/load-from-gas", async (req, res) => {
  let gasUrl = "";
  const supabase = initSupabase(req);
  if (supabase) {
    try {
      const settingsMap = await loadSettings(supabase);
      gasUrl = settingsMap["meta"]?.siap_gas_url || "";
    } catch (err) {
      console.error("[load-from-gas] Failed to load settings from Supabase:", err);
    }
  }

  if (!gasUrl) {
    try {
      const current = loadDb() || {};
      gasUrl = current.siap_gas_url || "";
    } catch (err) {}
  }

  if (!gasUrl) {
    return res.status(400).json({ success: false, message: "URL Google Apps Script belum dikonfigurasi." });
  }

  try {
    console.log(`[load-from-gas] Proxying fetch from GAS URL: ${gasUrl}`);
    const urlWithCacheBuster = gasUrl + (gasUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    const response = await fetch(urlWithCacheBuster);
    
    if (!response.ok) {
      throw new Error(`Google Apps Script responded with HTTP ${response.status}`);
    }

    const dataText = await response.text();
    let dataJson: any;
    try {
      dataJson = JSON.parse(dataText);
    } catch (e) {
      throw new Error("Respons dari Google Apps Script bukan format JSON yang valid.");
    }

    res.json(dataJson);
  } catch (err: any) {
    console.error("Failed to fetch from GAS URL:", err);
    res.status(500).json({ success: false, message: err.message || "Gagal mengambil data dari Google Apps Script." });
  }
});



// API: Send Email strictly via Google Apps Script (GAS) Web App (MailApp / GmailApp)
app.post("/api/send-email", async (req, res) => {
  const { recipient, subject, content, senderName, senderEmail } = req.body;

  let gasUrl = "";
  let schoolName = "SIAP Academic Management System";
  let schoolAddress = "Kementerian Agama RI • Madrasah Indonesia";
  let themeColor = "#10b981"; // default Emerald

  const supabase = initSupabase(req);
  if (supabase) {
    try {
      const settingsMap = await loadSettings(supabase);
      gasUrl = settingsMap["meta"]?.siap_gas_url || "";
      const sysSetting = settingsMap["system"] || {};
      if (sysSetting.schoolName) schoolName = sysSetting.schoolName;
      if (sysSetting.address) schoolAddress = sysSetting.address;
      if (sysSetting.themeColor) themeColor = sysSetting.themeColor;
      if (gasUrl) {
        console.log("[send-email] Loaded GAS URL from Supabase settingsMap:", gasUrl);
      }
    } catch (err) {
      console.error("[send-email] Failed to load settings from Supabase:", err);
    }
  }

  if (!gasUrl) {
    try {
      const current = loadDb() || {};
      gasUrl = current.siap_gas_url || "";
      const sysSetting = current.siap_system || {};
      if (sysSetting.schoolName) schoolName = sysSetting.schoolName;
      if (sysSetting.address) schoolAddress = sysSetting.address;
      if (sysSetting.themeColor) themeColor = sysSetting.themeColor;
      if (gasUrl) {
        console.log("[send-email] Loaded GAS URL from local DB:", gasUrl);
      }
    } catch (err) {}
  }

  // Build high-deliverability transactional HTML Email template to bypass SPAM folders completely
  const cleanContent = (content || "").replace(/\\n/g, "\n");
  const paragraphs = cleanContent
    .split("\n")
    .filter((p: string) => p.trim() !== "")
    .map((p: string) => `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #334155;">${p}</p>`)
    .join("");

  const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style type="text/css">
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; background-color: #f8fafc; }
    table { border-collapse: collapse; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; padding-top: 20px; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-collapse: collapse; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; }
    .header { background-color: #0f172a; text-align: center; padding: 32px 24px; border-bottom: 4px solid ${themeColor}; }
    .header-logo { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin: 0; }
    .header-sub { color: #94a3b8; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 40px 32px; background-color: #ffffff; }
    .title { font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
    .body-card { background-color: #f8fafc; border-left: 4px solid ${themeColor}; padding: 24px; border-radius: 0 8px 8px 0; margin: 24px 0; }
    .footer { background-color: #f1f5f9; padding: 24px; text-align: center; }
    .footer-address { color: #64748b; font-size: 12px; font-weight: 600; margin: 0 0 4px 0; }
    .footer-sub { color: #94a3b8; font-size: 11px; margin: 0; }
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="main" width="100%">
      <tr>
        <td class="header">
          <h1 class="header-logo" style="color: #ffffff; font-family: sans-serif;">${schoolName}</h1>
          <p class="header-sub" style="font-family: sans-serif;">Laporan Informasi Akademik</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          <h2 class="title" style="font-family: sans-serif; color: #0f172a;">${subject}</h2>
          <div style="font-family: sans-serif; font-size: 15px; color: #334155; line-height: 1.6;">
            <div class="body-card">
              ${paragraphs}
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer" style="font-family: sans-serif;">
          <p class="footer-address"><strong>${schoolName}</strong></p>
          <p class="footer-sub">${schoolAddress}</p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `;

  // Strip literal newlines to avoid existing GAS payload.content.replace(/\\n/g, "<br>") breaking our clean HTML layout tags
  const emailHtmlMinified = emailHtml.replace(/[\r\n]+/g, " ");

  if (gasUrl) {
    try {
      console.log(`[send-email] Routing real email to GAS URL: ${gasUrl}`);
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "send_email",
          recipient,
          subject,
          content: emailHtmlMinified,
          senderName: `${senderName || "Sistem SIAP"} via ${schoolName}`,
          senderEmail,
        }),
      });

      const responseText = await response.text();
      let responseJson: any = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {}

      if (response.ok && (responseJson.success || responseText.includes('"success":true'))) {
        console.log("Email sent successfully via Google Apps Script (MailApp).");
        return res.json({ 
          success: true, 
          simulated: false, 
          viaGas: true, 
          message: responseJson.message || "Email terkirim melalui Google Apps Script." 
        });
      } else {
        console.warn("GAS URL responded with error:", responseText);
        return res.status(500).json({
          success: false,
          message: `Gagal mengirim email via Google Apps Script: ${responseJson.message || responseText || 'Respon tidak valid'}`
        });
      }
    } catch (err: any) {
      console.error("Failed to send email via GAS URL:", err);
      return res.status(500).json({
        success: false,
        message: `Gagal koneksi ke Google Apps Script: ${err.message}`
      });
    }
  }

  // Fallback if GAS is not configured at all
  console.log(`[SIMULATION] GAS URL is not configured. Email to ${recipient} failed because GAS is required.`);
  res.status(400).json({ 
    success: false, 
    message: "Google Apps Script (GAS) belum dikonfigurasi di Pengaturan oleh Admin. Hubungkan Web App URL untuk mengaktifkan pengiriman email asli ke orang tua." 
  });
});

// Setup dev/prod static serving conditionally
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL && !process.env.NETLIFY) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Only start the server listening if run directly (not as a serverless function)
if (!process.env.VERCEL && !process.env.NETLIFY) {
  setupViteOrStatic().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
