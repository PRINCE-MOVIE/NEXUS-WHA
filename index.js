console.clear();

const util = require('util');
const NOISY_CONSOLE_PATTERNS = [
    'Connection Closed',
    'Cannot derive from empty media key',
    'rate-overlimit',
    'Failed to delete',
    "reading 'title'",
    '@whiskeysockets/baileys',
    'Bad MAC',
    'PreKeyError'
];
function textOfArgs(args) {
    return args.map(a => (typeof a === 'string' ? a : util.inspect(a, { depth: 6 }))).join(' ');
}
function isNoisyLog(args) {
    const text = textOfArgs(args);
    return NOISY_CONSOLE_PATTERNS.some(p => text.includes(p));
}
['log', 'error', 'warn', 'info'].forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args) => {
        if (isNoisyLog(args)) return;
        original(...args);
    };
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const chalk = require('chalk');
const crypto = require('crypto');
const FileType = require('file-type');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidDecode,
    downloadContentFromMessage,
    getBinaryNodeChild,
    makeInMemoryStore
} = require('@whiskeysockets/baileys');

const {
    smsg,
    getBuffer,
    getSizeMedia
} = require('./myfunc');

const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || 'sqx_admin_7f3a9c2e1b8d4f60';
const BLOCKED_FILE = path.join(__dirname, 'database', 'blocked.json');

function readBlocked() {
    try {
        const data = JSON.parse(fs.readFileSync(BLOCKED_FILE, 'utf8'));
        return data && typeof data === 'object' ? data : {};
    } catch (e) {
        return {};
    }
}

function writeBlocked(data) {
    fs.mkdirSync(path.dirname(BLOCKED_FILE), { recursive: true });
    fs.writeFileSync(BLOCKED_FILE, JSON.stringify(data, null, 2));
}

async function isNumberBlocked(numero) {
    return !!readBlocked()[numero];
}

async function blockNumber(numero, adminId, reason) {
    try {
        const data = readBlocked();
        data[numero] = { blockedAt: new Date().toISOString(), blockedBy: adminId || null, reason: reason || null };
        writeBlocked(data);
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

async function unblockNumber(numero) {
    try {
        const data = readBlocked();
        delete data[numero];
        writeBlocked(data);
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

process.on('uncaughtException', (err) => {
});
process.on('unhandledRejection', (reason) => {
});

const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const SESSIONS_DIR = path.join(__dirname, 'sessions');
fs.mkdirSync(SESSIONS_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'm'), { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessions = new Map(); 
const pendingCodes = new Map(); 

function getSessionDir(numero) {
    const clean = numero.replace(/[^0-9]/g, '');
    return path.join(SESSIONS_DIR, clean);
}

function broadcastSessions() {
    const data = [];
    for (const [numero, s] of sessions.entries()) {
        data.push({ numero, status: s.status, connectedAt: s.connectedAt, name: s.name || null });
    }
    io.emit('sessions:update', data);
}

async function loadExistingSessions() {
    if (!fs.existsSync(SESSIONS_DIR)) return;
    const dirs = fs.readdirSync(SESSIONS_DIR);
    for (const dir of dirs) {
        const fullPath = path.join(SESSIONS_DIR, dir);
        if (fs.statSync(fullPath).isDirectory()) {
            const credsFile = path.join(fullPath, 'creds.json');
            if (fs.existsSync(credsFile)) {
                await createSession(dir, null);
            }
        }
    }
}

async function createSession(numero, socketId) {
    const clean = numero.replace(/[^0-9]/g, '');

    if (sessions.has(clean) && sessions.get(clean).status === 'connected') {
        if (socketId) io.to(socketId).emit('error', { message: 'This number is already connected!' });
        return;
    }

    const connectedCount = [...sessions.values()].filter(s => s.status === 'connected').length;
    if (connectedCount >= 50 && !sessions.has(clean)) {
        if (socketId) io.to(socketId).emit('error', { message: 'SERVER_FULL' });
        return;
    }

    sessions.set(clean, { status: 'connecting', connectedAt: null, name: null });
    broadcastSessions();

    try {
        const sessionDir = getSessionDir(clean);
        fs.mkdirSync(sessionDir, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const prim = makeWASocket({
            printQRInTerminal: false,
            syncFullHistory: true,
            markOnlineOnConnect: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            generateHighQualityLinkPreview: true,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            logger: pino({ level: 'silent' }),
            auth: state
        });

        const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
        store.bind(prim.ev);

        await new Promise(r => setTimeout(r, 3000));

        if (!prim.authState.creds.registered) {
            try {
                const costum = "NEXUSCRZ";
                const code = await prim.requestPairingCode(clean, costum);
                const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
                pendingCodes.set(clean, formatted);
                io.to(`numero:${clean}`).emit('pairing:code', { numero: clean, code: formatted });
                if (socketId) io.to(socketId).emit('pairing:code', { numero: clean, code: formatted });
            } catch (e) {
                const errMsg = { message: 'Failed to generate code. Check the number.' };
                io.to(`numero:${clean}`).emit('error', errMsg);
                if (socketId) io.to(socketId).emit('error', errMsg);
                sessions.delete(clean);
                broadcastSessions();
                return;
            }
        }

        prim.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            } else return jid;
        };

        let node, attrs, bla;
        prim.ws.on('CB:message', (n) => { node = n.content; attrs = n.attrs; bla = n; });

        prim.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                if (mek.key && mek.key.remoteJid === 'status@broadcast') prim.readMessages([mek.key]);
                if (!prim.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
                if (mek.key.id.startsWith('73PPELI') && mek.key.id.length === 16) return;

                let m = smsg(prim, mek, store);
                m = { ...m, attributs: attrs, node };

                fs.mkdirSync('./m', { recursive: true });
                fs.writeFileSync(`./m/${m.attributs?.id || Date.now()}.json`, JSON.stringify(m, null, 2));

                require('./command.js')(prim, m, chatUpdate, store);
            } catch (error) {
            }
        });

        prim.getFile = async (PATH, save) => {
            let res;
            let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? fs.readFileSync(PATH) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
            let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' };
            let filename = path.join(__dirname, new Date() * 1 + '.' + type.ext);
            if (data && save) fs.promises.writeFile(filename, data);
            return { res, filename, size: await getSizeMedia(data), ...type, data };
        };

        prim.downloadMediaMessage = async (message) => {
            let mime = (message.msg || message).mimetype || '';
            let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(message, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            return buffer;
        };

        prim.sendText = (jid, text, quoted = '', options) => prim.sendMessage(jid, { text, ...options }, { quoted });

        prim.sendMedia = async (jid, filePath, caption = '', quoted = '', options = {}) => {
            let { mime, data } = await prim.getFile(filePath, true);
            let messageType = mime.split('/')[0];
            let messageContent = {};
            if (messageType === 'image') messageContent = { image: data, caption, ...options };
            else if (messageType === 'video') messageContent = { video: data, caption, ...options };
            else if (messageType === 'audio') messageContent = { audio: data, ptt: options.ptt || false, ...options };
            else messageContent = { document: data, mimetype: mime, fileName: options.fileName || 'file' };
            await prim.sendMessage(jid, messageContent, { quoted });
        };

        prim.sendPoll = async (jid, question, options) => {
            const pollMessage = {
                botInvokeMessage: {
                    message: {
                        messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                        pollCreationMessageV3: {
                            name: question,
                            options: options.map(o => ({ optionName: o })),
                            selectableCount: 1
                        }
                    }
                }
            };
            await prim.relayMessage(jid, pollMessage, {});
        };

        prim.public = true;
        prim.autoAI = false;
        prim.game = {};
        prim.tempIdStore = {};
        prim.lastMenuId = {};
        prim.db = {};

        prim.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                const name = prim.user?.name || prim.user?.id?.split(':')[0] || clean;
                sessions.set(clean, { sock: prim, store, status: 'connected', connectedAt: new Date().toISOString(), name, _retries: 0 });
                pendingCodes.delete(clean);
                io.to(`numero:${clean}`).emit('session:connected', { numero: clean, name });
                io.emit('session:connected', { numero: clean, name });
                broadcastSessions();
            }

  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode;
    const loggedOut = code === DisconnectReason.loggedOut;

    if (loggedOut) {
        sessions.delete(clean);
        fs.rmSync(getSessionDir(clean), { recursive: true, force: true });
        io.emit('session:disconnected', { numero: clean, reason: 'logged_out' });
        broadcastSessions();
    } else if (!prim.authState.creds.registered) {
        sessions.delete(clean);
        fs.rmSync(getSessionDir(clean), { recursive: true, force: true });
        io.to(`numero:${clean}`).emit('error', { message: 'Connection closed before pairing completed. Please try again.' });
        broadcastSessions();
    } else {
        const current = sessions.get(clean) || {};
        const retries = (current._retries || 0) + 1;

        if (retries >= 3) {
            sessions.delete(clean);
            fs.rmSync(getSessionDir(clean), { recursive: true, force: true });
            io.emit('session:disconnected', { numero: clean, reason: 'unreachable' });
            broadcastSessions();
        } else {
            sessions.set(clean, { ...current, status: 'reconnecting', _retries: retries });
            broadcastSessions();
            setTimeout(() => createSession(clean, null), 5000);
        }
    }
}
        });

        prim.ev.on('error', (err) => {
        });

        prim.ev.on('creds.update', saveCreds);

        sessions.set(clean, { ...(sessions.get(clean) || {}), sock: prim, store });

    } catch (err) {
        sessions.delete(clean);
        broadcastSessions();
        if (socketId) io.to(socketId).emit('error', { message: 'Internal error, try again.' });
    }
}

const setupApiRoutes = require('./api-routes');
setupApiRoutes(app, io);

app.post('/api/disconnect', async (req, res) => {
    let { numero } = req.body;
    if (!numero) return res.status(400).json({ error: 'Number required' });
    numero = numero.replace(/[^0-9]/g, '');

    const session = sessions.get(numero);
    if (session) {
        try { await session.sock?.logout?.(); } catch {}
        sessions.delete(numero);
        broadcastSessions();
    }
    try { fs.rmSync(getSessionDir(numero), { recursive: true, force: true }); } catch {}

    res.json({ ok: true, hadActiveSession: !!session });
});

function requireAdminSecret(req, res) {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== ADMIN_API_SECRET) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }
    return true;
}

async function terminateNumberEverywhere(numero, reason) {
    const session = sessions.get(numero);
    if (session) {
        try { await session.sock?.logout?.(); } catch {}
        sessions.delete(numero);
        broadcastSessions();
    }
    try { fs.rmSync(getSessionDir(numero), { recursive: true, force: true }); } catch {}
    return !!session;
}

app.post('/api/admin/disconnect-number', async (req, res) => {
    if (!requireAdminSecret(req, res)) return;
    let { numero } = req.body;
    if (!numero) return res.status(400).json({ error: 'Number required' });
    numero = numero.replace(/[^0-9]/g, '');

    const hadActiveSession = await terminateNumberEverywhere(numero, 'admin_disconnect');
    res.json({ ok: true, hadActiveSession });
});

app.post('/api/admin/block-number', async (req, res) => {
    if (!requireAdminSecret(req, res)) return;
    let { numero, adminId, reason } = req.body;
    if (!numero) return res.status(400).json({ error: 'Number required' });
    numero = numero.replace(/[^0-9]/g, '');

    const hadActiveSession = await terminateNumberEverywhere(numero, 'admin_blocked');
    const result = await blockNumber(numero, adminId, reason);
    if (result.error) return res.status(500).json({ error: result.error });

    res.json({ ok: true, hadActiveSession, blocked: true });
});

app.post('/api/admin/unblock-number', async (req, res) => {
    if (!requireAdminSecret(req, res)) return;
    let { numero } = req.body;
    if (!numero) return res.status(400).json({ error: 'Number required' });
    numero = numero.replace(/[^0-9]/g, '');

    const result = await unblockNumber(numero);
    if (result.error) return res.status(500).json({ error: result.error });

    res.json({ ok: true, blocked: false });
});

app.get('/api/sessions', (req, res) => {
    const data = [];
    for (const [numero, s] of sessions.entries()) {
        data.push({ numero, status: s.status, connectedAt: s.connectedAt, name: s.name || null });
    }
    res.json(data);
});

app.get('/api/code/:numero', (req, res) => {
    const numero = req.params.numero.replace(/[^0-9]/g, '');
    const code = pendingCodes.get(numero);
    const session = sessions.get(numero);
    res.json({
        code: code || null,
        status: session?.status || 'unknown'
    });
});

io.on('connection', (socket) => {

    const data = [];
    for (const [numero, s] of sessions.entries()) {
        data.push({ numero, status: s.status, connectedAt: s.connectedAt, name: s.name });
    }
    socket.emit('sessions:update', data);

    socket.on('connect:numero', async ({ numero, rejoinOnly }) => {
        if (!numero) return;
        const clean = numero.replace(/[^0-9]/g, '');
        socket.join(`numero:${clean}`);
        if (rejoinOnly) return;

        try {
            if (await isNumberBlocked(clean)) {
                io.to(`numero:${clean}`).emit('error', { message: 'This number cannot be used' });
                return;
            }
        } catch (e) {
        }

        await createSession(clean, socket.id);
    });

    socket.on('disconnect', () => {
    });
});

server.listen(PORT, async () => {
    console.log(chalk.hex('#6c5ce7').bold(`\n╔══════════════════════════════════════╗`));
    console.log(chalk.hex('#6c5ce7').bold(`║   Nexus Rx Web — Multi-Session     ║`));
    console.log(chalk.hex('#6c5ce7').bold(`║   http://localhost:${PORT}              ║`));
    console.log(chalk.hex('#6c5ce7').bold(`╚══════════════════════════════════════╝\n`));
    await loadExistingSessions();
});

const RESTART_INTERVAL_MS = 12 * 60 * 60 * 1000; 

setTimeout(async () => {

    for (const [numero, s] of sessions.entries()) {
        try { s.sock?.ws?.close(); } catch {}
    }

    setTimeout(() => process.exit(0), 2000);

}, RESTART_INTERVAL_MS);

