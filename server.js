const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 25 * 1e6 });

const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ===== Penyimpanan file JSON sederhana =====
// CATATAN: di hosting gratis, disk biasanya di-reset saat redeploy.
// Untuk data permanen jangka panjang, sebaiknya pindah ke database
// (mis. PostgreSQL/MongoDB) nanti.
function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let users = readJSON(USERS_FILE, {}); // username -> { passwordHash, contacts: [] }
let messages = readJSON(MESSAGES_FILE, {}); // "userA|userB" -> [messages]

// ===== SEED 10 AKUN DEMO (cuma jalan sekali, pas users.json masih kosong) =====
const DEMO_PASSWORD = "chatku123";
const DEMO_USERNAMES = ["budi","siti","andi","dewi","rian","lina","agus","mira","doni","sari"];

function seedDemoAccountsIfEmpty() {
  if (Object.keys(users).length > 0) return; // udah ada data, jangan timpa

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  DEMO_USERNAMES.forEach((name) => {
    users[name] = {
      passwordHash: hash,
      contacts: DEMO_USERNAMES.filter((n) => n !== name), // saling kontak satu sama lain
    };
  });
  saveUsers();
  console.log("10 akun demo berhasil dibuat (username: " + DEMO_USERNAMES.join(", ") + " | password: " + DEMO_PASSWORD + ")");
}

function roomKeyFor(a, b) {
  return [a, b].sort().join("|");
}
function getHistory(a, b) {
  const key = roomKeyFor(a, b);
  if (!messages[key]) messages[key] = [];
  return messages[key];
}
function saveMessages() {
  writeJSON(MESSAGES_FILE, messages);
}
function saveUsers() {
  writeJSON(USERS_FILE, users);
}

seedDemoAccountsIfEmpty();

// ===== Sesi login sederhana (token di memori) =====
const sessions = new Map(); // token -> username

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

// ===== Upload file (gambar/video/dokumen/voice note) =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // max 20MB

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

// ===== REGISTER =====
app.post("/api/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (username.length < 3) {
    return res.json({ ok: false, message: "Username minimal 3 karakter." });
  }
  if (password.length < 4) {
    return res.json({ ok: false, message: "Password minimal 4 karakter." });
  }
  if (users[username]) {
    return res.json({ ok: false, message: "Username sudah dipakai." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  users[username] = { passwordHash, contacts: [] };
  saveUsers();

  const token = makeToken();
  sessions.set(token, username);

  res.json({ ok: true, token, username });
});

// ===== LOGIN =====
app.post("/api/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  const user = users[username];
  if (!user) {
    return res.json({ ok: false, message: "Akun tidak ditemukan." });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.json({ ok: false, message: "Password salah." });
  }

  const token = makeToken();
  sessions.set(token, username);

  res.json({ ok: true, token, username });
});

// ===== VALIDASI TOKEN (auto-login) =====
app.post("/api/validate", (req, res) => {
  const token = String(req.body.token || "");
  const username = sessions.get(token);
  if (!username) return res.json({ ok: false });
  res.json({ ok: true, username });
});

// ===== UPLOAD FILE =====
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.json({ ok: false, message: "Tidak ada file." });
  res.json({
    ok: true,
    url: "/uploads/" + req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
  });
});

// ===== SOCKET.IO =====
const onlineUsers = new Map(); // username -> socket.id

function broadcastUserList() {
  io.emit("online-users", Array.from(onlineUsers.keys()));
}

io.on("connection", (socket) => {
  let currentUsername = null;

  socket.on("auth", (token, ack) => {
    const username = sessions.get(token);
    if (!username) {
      ack && ack({ ok: false, message: "Sesi tidak valid, silakan login ulang." });
      return;
    }
    currentUsername = username;
    onlineUsers.set(username, socket.id);
    ack && ack({ ok: true, username });
    broadcastUserList();
  });

  socket.on("get-contacts", () => {
    if (!currentUsername) return;
    const contacts = (users[currentUsername]?.contacts || []).map((name) => ({
      username: name,
      online: onlineUsers.has(name),
    }));
    socket.emit("contacts-list", contacts);
  });

  socket.on("add-contact", (targetUsername, ack) => {
    targetUsername = String(targetUsername || "").trim();
    if (!currentUsername) return ack && ack({ ok: false, message: "Belum login." });
    if (targetUsername === currentUsername) {
      return ack && ack({ ok: false, message: "Gak bisa menambahkan diri sendiri." });
    }
    if (!users[targetUsername]) {
      return ack && ack({ ok: false, message: "Username tidak ditemukan." });
    }
    const me = users[currentUsername];
    if (!me.contacts) me.contacts = [];
    if (!me.contacts.includes(targetUsername)) {
      me.contacts.push(targetUsername);
      saveUsers();
    }
    const contacts = me.contacts.map((name) => ({
      username: name,
      online: onlineUsers.has(name),
    }));
    ack && ack({ ok: true, contacts });
  });

  socket.on("get-history", ({ withUser }) => {
    if (!currentUsername || !withUser) return;
    socket.emit("history", {
      withUser,
      messages: getHistory(currentUsername, withUser),
    });
  });

  // type: text | image | video | document | voice
  socket.on("private-message", (payload) => {
    if (!currentUsername || !payload || !payload.to) return;

    const message = {
      id: uuidv4(),
      from: currentUsername,
      to: payload.to,
      type: payload.type || "text",
      text: payload.text || "",
      fileUrl: payload.fileUrl || null,
      fileName: payload.fileName || null,
      time: Date.now(),
    };

    getHistory(currentUsername, payload.to).push(message);
    saveMessages();

    const targetSocketId = onlineUsers.get(payload.to);
    if (targetSocketId) io.to(targetSocketId).emit("private-message", message);
    socket.emit("private-message", message);
  });

  socket.on("typing", ({ to }) => {
    if (!currentUsername || !to) return;
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) io.to(targetSocketId).emit("typing", { from: currentUsername });
  });

  // ===== WebRTC SIGNALING (video/voice call) =====
  socket.on("call-user", ({ to, offer, callType }) => {
    const targetSocketId = onlineUsers.get(to);
    if (!targetSocketId) {
      socket.emit("call-failed", { reason: "user-offline", to });
      return;
    }
    io.to(targetSocketId).emit("incoming-call", { from: currentUsername, offer, callType });
  });

  socket.on("call-answer", ({ to, answer }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) io.to(targetSocketId).emit("call-answered", { from: currentUsername, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) io.to(targetSocketId).emit("ice-candidate", { from: currentUsername, candidate });
  });

  socket.on("call-rejected", ({ to }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) io.to(targetSocketId).emit("call-rejected", { from: currentUsername });
  });

  socket.on("call-ended", ({ to }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) io.to(targetSocketId).emit("call-ended", { from: currentUsername });
  });

  socket.on("disconnect", () => {
    if (currentUsername && onlineUsers.get(currentUsername) === socket.id) {
      onlineUsers.delete(currentUsername);
      broadcastUserList();
    }
  });
});

server.listen(PORT, () => {
  console.log(`ChatKu v2 server jalan di port ${PORT}`);
});
