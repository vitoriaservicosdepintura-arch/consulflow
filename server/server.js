const express = require('express');
require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // 100mb
});

process.on('uncaughtException', (err) => {
    console.error('🚫 Erro fatal evitado:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚫 Promessa não tratada evitada:', reason);
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

let qrCodeData = '';
let isConnected = false;
let mensagensRecebidas = [];
let iaAtivaPorContato = {};
let chatHistoryIA = {};

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
            '--disable-gpu', '--disable-extensions', '--disable-background-networking'
        ]
    }
});

io.on('connection', (socket) => {
    const status = isConnected ? 'conectado' : (qrCodeData ? 'aguardando_qr' : 'iniciando');
    socket.emit('status_update', { status });
    if (mensagensRecebidas.length > 0) socket.emit('init_messages', mensagensRecebidas);
});

client.on('qr', async (qr) => {
    qrCodeData = qr; isConnected = false;
    const qrImage = await qrcode.toDataURL(qr);
    io.emit('status_update', { status: 'aguardando_qr', qr_code_imagem: qrImage });
});

client.on('ready', async () => {
    console.log('✅ WhatsApp conectado!');
    isConnected = true; qrCodeData = '';
    io.emit('status_update', { status: 'conectado' });

    try {
        const chats = await client.getChats();
        const individuais = chats.filter(c => !c.isGroup).slice(0, 15);
        for (const chat of individuais) {
            const msgs = await chat.fetchMessages({ limit: 10 });
            for (const msg of msgs) {
                const peerId = msg.fromMe ? msg.to : msg.from;
                mensagensRecebidas.push({
                    id: msg.id.id,
                    de_raw: peerId,
                    fromMe: msg.fromMe,
                    nome: chat.name || peerId,
                    texto: msg.body || (msg.hasMedia ? `📎 [Mídia: ${msg.type}]` : ''),
                    type: msg.type,
                    hasMedia: msg.hasMedia,
                    horario: new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: msg.timestamp
                });
            }
        }
        io.emit('init_messages', mensagensRecebidas);
    } catch (err) { }
});

client.on('message_create', async (msg) => {
    const peerId = msg.fromMe ? msg.to : msg.from;
    if (peerId.includes('@g.us') || msg.isStatus) return;

    const contato = await client.getContactById(peerId).catch(() => null);
    const nome = contato?.name || contato?.pushname || peerId.replace('@c.us', '');

    let mediaData = null;
    if (msg.hasMedia) {
        try {
            const media = await msg.downloadMedia();
            if (media) {
                mediaData = {
                    mimetype: media.mimetype,
                    data: media.data,
                    filename: media.filename
                };
            }
        } catch (e) { console.error("Erro download media:", e.message); }
    }

    const novaMsg = {
        id: msg.id.id,
        de_raw: peerId,
        fromMe: msg.fromMe,
        nome: nome,
        texto: msg.body,
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now() / 1000,
        type: msg.type,
        hasMedia: msg.hasMedia,
        media: mediaData
    };

    mensagensRecebidas.unshift(novaMsg);
    if (mensagensRecebidas.length > 200) mensagensRecebidas.pop();
    io.emit('nova_mensagem', novaMsg);

    // Push Online instantâneo
    if (!msg.fromMe) {
        io.emit('presenca_update', { id_raw: peerId, isOnline: true, lastSeen: null });
    }

    if (iaAtivaPorContato[peerId]) {
        if (!chatHistoryIA[peerId]) {
            chatHistoryIA[peerId] = [{ role: "system", content: "Você é a IA da SVG Multimídia. Responda de forma natural, curta e direta via WhatsApp. Entenda emoções." }];
        }
        if (msg.body) {
            chatHistoryIA[peerId].push({ role: msg.fromMe ? "assistant" : "user", content: msg.body });
            if (chatHistoryIA[peerId].length > 15) chatHistoryIA[peerId].splice(1, 1);
            if (!msg.fromMe) gerarSugestao(peerId);
        }
    }
});

client.on('presence_update', (data) => {
    const id = data.id?._serialized || data.id;
    if (!id) return;
    const isOnline = data.type === 'available' || data.type === 'typing' || data.type === 'recording';
    io.emit('presenca_update', {
        id_raw: id,
        isOnline: isOnline,
        lastSeen: !isOnline ? Date.now() / 1000 : null
    });
});

async function gerarSugestao(id_raw) {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: chatHistoryIA[id_raw],
        }, {
            headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" }
        });
        io.emit('ia_sugestao', { id_raw, sugestao: response.data.choices[0].message.content });
    } catch (e) { console.error('Erro IA Sugestão:', e.message); }
}

app.get('/api/status', async (req, res) => {
    if (isConnected) return res.json({ status: 'conectado' });
    const qrImage = qrCodeData ? await qrcode.toDataURL(qrCodeData) : null;
    res.json({ status: qrCodeData ? 'aguardando_qr' : 'iniciando', qr_code_imagem: qrImage });
});

app.get('/api/mensagens', (req, res) => res.json(mensagensRecebidas));
app.get('/api/ia/status', (req, res) => res.json(iaAtivaPorContato));
app.post('/api/ia/toggle', (req, res) => {
    iaAtivaPorContato[req.body.id_raw] = !!req.body.enable;
    res.json({ sucesso: true, ativa: iaAtivaPorContato[req.body.id_raw] });
});
app.get('/api/ia/sugerir', (req, res) => { gerarSugestao(req.query.id_raw); res.json({ ok: true }); });

app.get('/api/foto', async (req, res) => {
    try { res.json({ url: await client.getProfilePicUrl(req.query.id) }); } catch { res.json({ url: null }); }
});

app.get('/api/presenca', async (req, res) => {
    try {
        const id = req.query.id;
        // GATILHO: Inscrever na presença do contato para receber eventos
        await client.subscribePresence(id).catch(() => { });

        const contact = await client.getContactById(id);
        const presence = await contact.getPresence();

        let lastSeenFormatted = null;
        const now = new Date();

        if (presence.lastSeen) {
            const date = new Date(presence.lastSeen * 1000);
            const isToday = date.toDateString() === now.toDateString();
            const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            lastSeenFormatted = isToday ? `hoje às ${time}` : `em ${date.toLocaleDateString('pt-BR')} às ${time}`;
        } else {
            // Heurística baseada na última mensagem se a privacidade esconder o lastSeen
            const lastInMsg = mensagensRecebidas.find(m => m.de_raw === id && !m.fromMe);
            if (lastInMsg) {
                const date = new Date(lastInMsg.timestamp * 1000);
                const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                lastSeenFormatted = `hoje às ${time}`;
            }
        }

        const isOnline = presence.type === 'available' || presence.isOnline === true;
        res.json({ isOnline, lastSeen: lastSeenFormatted });
    } catch (e) { res.json({ isOnline: false, lastSeen: null }); }
});

app.post('/api/enviar', async (req, res) => {
    try { await client.sendMessage(req.body.de_raw, req.body.mensagem); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/enviar-midia', async (req, res) => {
    try {
        const pureBase = req.body.base64data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        const media = new MessageMedia(req.body.mimetype, pureBase, req.body.filename);
        await client.sendMessage(req.body.de_raw, media, { caption: req.body.legend });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/desconectar', async (req, res) => {
    try {
        console.log("🛑 Solicitando desconexão total...");
        await client.logout().catch(() => { });
        await client.destroy().catch(() => { });

        const authPath = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }

        isConnected = false;
        qrCodeData = '';
        mensagensRecebidas = [];
        iaAtivaPorContato = {};
        chatHistoryIA = {};

        io.emit('status_update', { status: 'iniciando' });
        io.emit('init_messages', []);

        res.json({ ok: true });

        console.log("♻️ Encerrando processo para limpeza total... O sistema irá reiniciar.");
        setTimeout(() => process.exit(0), 1000);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

server.listen(3001, () => console.log('🚀 Server ON 3001'));
client.initialize();
