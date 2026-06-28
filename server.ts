import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set large JSON limits to support base64 images (student photos, card signatures, stamps)
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  const dbPath = path.join(process.cwd(), 'database.json');

  // Load database safely
  const loadDb = () => {
    if (fs.existsSync(dbPath)) {
      try {
        const fileContent = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(fileContent);
      } catch (e) {
        console.error("Error reading database file, using empty default:", e);
      }
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

  // API: Load State
  app.get("/api/load", (req, res) => {
    const data = loadDb();
    if (data) {
      res.json({ success: true, data });
    } else {
      res.json({ success: false, message: "No data stored yet on server." });
    }
  });

  // API: Save State
  app.post("/api/save", (req, res) => {
    const payload = req.body;
    const current = loadDb() || {};
    const updated = { ...current, ...payload };
    const success = saveDb(updated);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, message: "Failed to write database file." });
    }
  });

  // API: Save GAS URL directly
  app.post("/api/save-gas-url", (req, res) => {
    const { gasUrl } = req.body;
    const current = loadDb() || {};
    current.siap_gas_url = gasUrl;
    const success = saveDb(current);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, message: "Failed to save gasUrl." });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
