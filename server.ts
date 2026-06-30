import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

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
