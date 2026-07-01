import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import firebaseConfigLocal from "./firebase-applet-config.json";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set large JSON limits to support base64 images (student photos, card signatures, stamps)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const baseDbPath = path.join(process.cwd(), 'database.json');
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'database.json')
  : baseDbPath;

// Load database safely
const loadDb = () => {
  if (process.env.VERCEL && !fs.existsSync(dbPath) && fs.existsSync(baseDbPath)) {
    try {
      const fileContent = fs.readFileSync(baseDbPath, 'utf8');
      fs.writeFileSync(dbPath, fileContent, 'utf8');
    } catch (e) {
      console.error("Error copying base database to /tmp:", e);
    }
  }

  if (fs.existsSync(dbPath)) {
    try {
      const fileContent = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(fileContent);
    } catch (e) {
      console.error("Error reading database file, using empty default:", e);
    }
  } else if (fs.existsSync(baseDbPath)) {
    try {
      const fileContent = fs.readFileSync(baseDbPath, 'utf8');
      return JSON.parse(fileContent);
    } catch (e) {}
  }
  return null;
};

// Save database safely
const saveDb = (data: any) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("Error writing database file:", e);
    return false;
  }
};

// --- FIREBASE FIRESTORE UTILITIES ---
let db: any = null;
let lastInitError: string | null = null;

function initFirebase() {
  if (db) return db;

  // 1. Try initializing via Environment Variables (standard & highly recommended for Vercel/Production)
  const envProjectId = process.env.FIREBASE_PROJECT_ID;
  const envApiKey = process.env.FIREBASE_API_KEY;
  if (envProjectId && envApiKey) {
    try {
      const firebaseConfig = {
        apiKey: envApiKey,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: envProjectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
      };
      // Serverless-safe initialization: check if default app already exists
      const appObj = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(appObj, process.env.FIREBASE_DATABASE_ID || "(default)");
      console.log("Firebase Firestore initialized successfully via Environment Variables. Project ID:", envProjectId);
      return db;
    } catch (error: any) {
      console.error("Firebase init via Environment Variables failed:", error);
      lastInitError = error instanceof Error ? error.message : String(error);
    }
  }

  // 2. Fallback to statically imported firebaseConfigLocal (extremely reliable for Vercel/bundlers)
  if (firebaseConfigLocal && firebaseConfigLocal.projectId && firebaseConfigLocal.apiKey) {
    try {
      const firebaseConfig = {
        apiKey: firebaseConfigLocal.apiKey,
        authDomain: firebaseConfigLocal.authDomain,
        projectId: firebaseConfigLocal.projectId,
        storageBucket: firebaseConfigLocal.storageBucket,
        messagingSenderId: firebaseConfigLocal.messagingSenderId,
        appId: firebaseConfigLocal.appId
      };
      // Serverless-safe initialization: check if default app already exists
      const appObj = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(appObj, firebaseConfigLocal.firestoreDatabaseId || "(default)");
      console.log("Firebase Firestore initialized successfully via Bundled Config. Project ID:", firebaseConfigLocal.projectId);
      return db;
    } catch (error: any) {
      console.error("Firebase init via Bundled Config failed:", error);
      lastInitError = error instanceof Error ? error.message : String(error);
    }
  }

  // 3. Last resort fallback to local config file read (if bundled config was missing)
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.warn("Firebase config file not found at:", configPath, "and env variables are not fully configured. Using offline JSON database fallback.");
    return null;
  }
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.projectId || !config.apiKey) return null;

    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };
    // Serverless-safe initialization: check if default app already exists
    const appObj = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(appObj, config.firestoreDatabaseId || "(default)");
    console.log("Firebase Firestore initialized successfully with Project ID:", config.projectId);
    return db;
  } catch (error: any) {
    console.error("Firebase init failed:", error);
    lastInitError = error instanceof Error ? error.message : String(error);
    return null;
  }
}

// Save a large string by chunking it into multiple documents in a "chunks" subcollection
async function saveLargeField(firebaseDb: any, docPath: { col: string, id: string }, value: string) {
  try {
    const { col, id } = docPath;
    if (!value) {
      // Clear any existing chunked data
      const chunksColRef = collection(firebaseDb, col, id, "chunks");
      const existingChunks = await getDocs(chunksColRef);
      const deletePromises: Promise<any>[] = [];
      existingChunks.forEach(docSnap => {
        deletePromises.push(deleteDoc(docSnap.ref));
      });
      await Promise.all(deletePromises);

      await setDoc(doc(firebaseDb, col, id), { type: "simple", value: "" });
      return;
    }

    // If string is small (< 500KB), save it directly
    if (value.length < 500000) {
      await setDoc(doc(firebaseDb, col, id), { type: "simple", value });
      return;
    }

    // Otherwise, chunk it into ~800KB blocks
    const CHUNK_SIZE = 800000;
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.substring(i, i + CHUNK_SIZE));
    }

    // Clear existing chunks first
    const chunksColRef = collection(firebaseDb, col, id, "chunks");
    const existingChunks = await getDocs(chunksColRef);
    const deletePromises: Promise<any>[] = [];
    existingChunks.forEach(docSnap => {
      deletePromises.push(deleteDoc(docSnap.ref));
    });
    await Promise.all(deletePromises);

    // Save new chunks
    const writePromises = chunks.map((chunk, idx) => {
      return setDoc(doc(firebaseDb, col, id, "chunks", `c_${idx}`), { chunk, idx });
    });
    await Promise.all(writePromises);

    // Update the parent document
    await setDoc(doc(firebaseDb, col, id), { type: "chunked", count: chunks.length });
    console.log(`Successfully saved chunked asset to ${col}/${id} with ${chunks.length} chunks.`);
  } catch (err) {
    console.error(`Error saving large field at ${docPath.col}/${docPath.id}:`, err);
  }
}

// Load a potentially chunked large string
async function loadLargeField(firebaseDb: any, col: string, id: string): Promise<string> {
  try {
    const docRef = doc(firebaseDb, col, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return "";
    const data = docSnap.data();
    if (data.type === "simple") {
      return data.value || "";
    }
    if (data.type === "chunked") {
      const count = data.count || 0;
      const chunksColRef = collection(firebaseDb, col, id, "chunks");
      const snapshot = await getDocs(chunksColRef);
      const chunkMap: { [key: number]: string } = {};
      snapshot.forEach(docSnap => {
        const cData = docSnap.data();
        chunkMap[cData.idx] = cData.chunk || "";
      });
      let fullStr = "";
      for (let i = 0; i < count; i++) {
        fullStr += chunkMap[i] || "";
      }
      return fullStr;
    }
    return "";
  } catch (err) {
    console.error(`Error loading large field ${col}/${id}:`, err);
    return "";
  }
}

// Delete large field and its chunks
async function deleteLargeField(firebaseDb: any, col: string, id: string) {
  try {
    const chunksColRef = collection(firebaseDb, col, id, "chunks");
    const snapshot = await getDocs(chunksColRef);
    const deletePromises: Promise<any>[] = [];
    snapshot.forEach(docSnap => {
      deletePromises.push(deleteDoc(docSnap.ref));
    });
    await Promise.all(deletePromises);
    await deleteDoc(doc(firebaseDb, col, id));
  } catch (err) {
    console.error(`Error deleting large field ${col}/${id}:`, err);
  }
}

async function loadCollection(firebaseDb: any, colName: string): Promise<any[]> {
  try {
    const colRef = collection(firebaseDb, colName);
    const snapshot = await getDocs(colRef);
    const result: any[] = [];
    snapshot.forEach(docSnap => {
      result.push(docSnap.data());
    });

    // If loading students, transparently fetch externalized student photoUrls if they are externalized
    if (colName === "students") {
      const fetchPhotoPromises = result.map(async (student) => {
        if (student.photoUrl === "__EXTERNAL_FIRESTORE_PHOTO__") {
          student.photoUrl = await loadLargeField(firebaseDb, "student_photos", student.nisn);
        }
      });
      await Promise.all(fetchPhotoPromises);
    }

    return result;
  } catch (err) {
    console.error(`Error loading collection ${colName}:`, err);
    return [];
  }
}

async function loadSettings(firebaseDb: any): Promise<any> {
  try {
    const colRef = collection(firebaseDb, "settings");
    const snapshot = await getDocs(colRef);
    const settings: any = {};
    snapshot.forEach(docSnap => {
      settings[docSnap.id] = docSnap.data();
    });
    return settings;
  } catch (err) {
    console.error("Error loading settings:", err);
    return {};
  }
}

async function syncCollection(firebaseDb: any, colName: string, list: any[] | undefined, getId: (item: any) => string) {
  if (!list || !Array.isArray(list)) return;

  try {
    const colRef = collection(firebaseDb, colName);
    const snapshot = await getDocs(colRef);
    const existingIds = new Set<string>();

    snapshot.forEach(docSnap => {
      existingIds.add(docSnap.id);
    });

    const currentIds = new Set(list.map(getId).filter(id => id !== undefined && id !== null && id !== ''));

    // Save all current items
    const savePromises = list.map(async (item) => {
      const id = getId(item);
      if (!id) return;

      let finalItem = { ...item };
      // Transparently externalize and chunk very large student photos
      if (colName === "students" && item.photoUrl && item.photoUrl.length > 200000) {
        await saveLargeField(firebaseDb, { col: "student_photos", id }, item.photoUrl);
        finalItem.photoUrl = "__EXTERNAL_FIRESTORE_PHOTO__";
      }

      const docRef = doc(firebaseDb, colName, id);
      await setDoc(docRef, finalItem);
    });

    // Delete missing items
    const deletePromises: Promise<any>[] = [];
    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        const docRef = doc(firebaseDb, colName, id);
        deletePromises.push(deleteDoc(docRef));

        // If a student is deleted, clean up their external photo as well
        if (colName === "students") {
          deletePromises.push(deleteLargeField(firebaseDb, "student_photos", id));
        }
      }
    });

    await Promise.all([...savePromises, ...deletePromises]);
  } catch (err) {
    console.error(`Error syncing collection ${colName}:`, err);
  }
}

async function saveToFirestore(firebaseDb: any, payload: any) {
  try {
    await Promise.all([
      syncCollection(firebaseDb, "students", payload.siap_students, item => item.nisn),
      syncCollection(firebaseDb, "teachers", payload.siap_teachers, item => item.nuptk),
      syncCollection(firebaseDb, "attendance", payload.siap_attendance, item => item.id),
      syncCollection(firebaseDb, "grades", payload.siap_grades, item => item.id),
      syncCollection(firebaseDb, "cases", payload.siap_cases, item => item.id),
      syncCollection(firebaseDb, "achievements", payload.siap_achievements, item => item.id),
      syncCollection(firebaseDb, "emails", payload.siap_emails, item => item.id),
      syncCollection(firebaseDb, "holidays", payload.siap_holidays, item => item.id),
      syncCollection(firebaseDb, "class_staffs", payload.siap_class_staffs, item => item.classId),
      payload.siap_academic ? setDoc(doc(firebaseDb, "settings", "academic"), payload.siap_academic) : Promise.resolve(),
      payload.siap_system ? setDoc(doc(firebaseDb, "settings", "system"), payload.siap_system) : Promise.resolve(),
      setDoc(doc(firebaseDb, "settings", "meta"), {
        siap_gas_url: payload.siap_gas_url || ""
      }),
      saveLargeField(firebaseDb, { col: "settings", id: "signature" }, payload.siap_card_signature_img || ""),
      saveLargeField(firebaseDb, { col: "settings", id: "stamp" }, payload.siap_card_stamp_img || "")
    ]);
  } catch (err) {
    console.error("Error saving state to Firestore:", err);
  }
}

// API: Load State
app.get("/api/load", async (req, res) => {
  const firebaseDb = initFirebase();
  if (firebaseDb) {
    try {
      console.log("Loading database from Firebase Firestore...");
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
        stampImg
      ] = await Promise.all([
        loadCollection(firebaseDb, "students"),
        loadCollection(firebaseDb, "teachers"),
        loadCollection(firebaseDb, "attendance"),
        loadCollection(firebaseDb, "grades"),
        loadCollection(firebaseDb, "cases"),
        loadCollection(firebaseDb, "achievements"),
        loadCollection(firebaseDb, "emails"),
        loadCollection(firebaseDb, "holidays"),
        loadCollection(firebaseDb, "class_staffs"),
        loadSettings(firebaseDb),
        loadLargeField(firebaseDb, "settings", "signature"),
        loadLargeField(firebaseDb, "settings", "stamp")
      ]);

      if (students.length > 0 || teachers.length > 0) {
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
          siap_system: settingsMap["system"] || null,
          siap_gas_url: settingsMap["meta"]?.siap_gas_url || "",
          siap_card_signature_img: signatureImg,
          siap_card_stamp_img: stampImg
        };
        console.log("Database successfully loaded from Firestore.");
        return res.json({ success: true, data: assembledData, storageMode: "firestore" });
      } else {
        console.log("Firestore is empty. Loading local database.json and seeding to Firestore...");
      }
    } catch (err) {
      console.error("Failed to load from Firestore, falling back to local JSON database:", err);
    }
  }

  const data = loadDb();
  if (data) {
    let mode = "local";
    if (firebaseDb) {
      mode = "firestore-seeding";
      try {
        console.log("Auto-seeding local database data to Firestore...");
        saveToFirestore(firebaseDb, data).then(() => {
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
    res.json({ success: false, message: "No data stored yet on server.", storageMode: firebaseDb ? "firestore-empty" : "local" });
  }
});

// API: Check Database & Firebase connection status
app.get("/api/status", (req, res) => {
  const firebaseDb = initFirebase();
  const envProjectId = process.env.FIREBASE_PROJECT_ID;
  const envApiKey = process.env.FIREBASE_API_KEY;
  
  const detectedEnvKeys: Record<string, { exists: boolean, length: number }> = {};
  const firebaseVars = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_API_KEY",
    "FIREBASE_APP_ID",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_DATABASE_ID",
    "FIREBASE_STORAGE_BUCKET",
    "FIREBASE_MESSAGING_SENDER_ID"
  ];
  
  firebaseVars.forEach(key => {
    const val = process.env[key];
    detectedEnvKeys[key] = {
      exists: typeof val !== "undefined",
      length: val ? val.length : 0
    };
  });

  res.json({
    firebaseInitialized: !!firebaseDb,
    usingEnvVariables: !!(envProjectId && envApiKey),
    projectId: envProjectId || null,
    storageMode: firebaseDb ? "firestore" : "local_file_only",
    vercelEnv: !!process.env.VERCEL,
    lastInitError: lastInitError,
    envKeysDetected: detectedEnvKeys
  });
});

// API: Save State
app.post("/api/save", async (req, res) => {
  const payload = req.body;
  const current = loadDb() || {};
  const updated = { ...current, ...payload };
  const success = saveDb(updated);

  const firebaseDb = initFirebase();
  if (firebaseDb) {
    try {
      console.log("Saving state to Firebase Firestore...");
      await saveToFirestore(firebaseDb, payload);
      console.log("State successfully synced to Firestore.");
    } catch (err) {
      console.error("Failed to sync state to Firebase Firestore:", err);
    }
  }

  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, message: "Failed to write database file." });
  }
});

// API: Save GAS URL directly
app.post("/api/save-gas-url", async (req, res) => {
  const { gasUrl } = req.body;
  const current = loadDb() || {};
  current.siap_gas_url = gasUrl;
  const success = saveDb(current);

  const firebaseDb = initFirebase();
  if (firebaseDb) {
    try {
      console.log("Saving GAS URL to Firebase Firestore...");
      const docRef = doc(firebaseDb, "settings", "meta");
      await setDoc(docRef, { siap_gas_url: gasUrl }, { merge: true });
      console.log("GAS URL successfully synced to Firestore.");
    } catch (err) {
      console.error("Failed to sync GAS URL to Firestore:", err);
    }
  }

  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, message: "Failed to save gasUrl." });
  }
});

// API: Send Email via SMTP or simulated fallback
app.post("/api/send-email", async (req, res) => {
  const { recipient, subject, content, senderName, senderEmail } = req.body;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === "true";
  const smtpFrom = process.env.SMTP_FROM || smtpUser || "noreply@madrasah.sch.id";

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${senderName || "SIAP Akademik"}" <${senderEmail || smtpFrom}>`,
        to: recipient,
        replyTo: senderEmail || undefined,
        subject: subject,
        text: content,
        html: content.replace(/\n/g, "<br>"), // basic plaintext to HTML wrapper
      });

      console.log("Real SMTP Email Sent successfully:", info.messageId);
      res.json({ success: true, simulated: false, messageId: info.messageId });
    } catch (err: any) {
      console.error("SMTP sending failed:", err);
      res.status(500).json({ success: false, message: `Gagal mengirim email riil: ${err.message}` });
    }
  } else {
    // Simulated fallback
    console.log(`[SIMULATION] Sending email to ${recipient}: ${subject}`);
    res.json({ 
      success: true, 
      simulated: true, 
      message: "SMTP belum dikonfigurasi di .env. Pengiriman email disimulasikan." 
    });
  }
});

// Setup dev/prod static serving conditionally
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
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
if (!process.env.VERCEL) {
  setupViteOrStatic().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
