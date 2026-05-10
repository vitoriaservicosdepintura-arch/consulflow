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
    }
});

// Impede o servidor Node de "crashar" por erros internos do Puppeteer/WhatsApp Web
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let qrCodeData = '';
let isConnected = false;
let mensagensRecebidas = [];
let iaAtivaPorContato = {}; // de_raw -> boolean
let chatHistoryIA = {};    // de_raw -> [{role, content}]

// ==========================================
// CONFIGURAÇÃO DO CLIENTE WHATSAPP
// ==========================================
const clientConfig = {
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-networking',
        ]
    }
};

const client = new Client(clientConfig);

// ==========================================
// EVENTOS DO CLIENTE
// ==========================================
client.on('qr', async (qr) => {
    qrCodeData = qr;
    isConnected = false;
    try {
        const qrImage = await qrcode.toDataURL(qr);
        io.emit('status_update', { status: 'aguardando_qr', qr_code_imagem: qrImage });
    } catch { }
});

client.on('ready', async () => {
    console.log('✅ WhatsApp conectado com sucesso!');
    isConnected = true;
    qrCodeData = '';
    io.emit('status_update', { status: 'conectado' });

    // Carregar iniciais
    try {
        const chats = await client.getChats();
        const individuais = chats.filter(c => !c.isGroup).slice(0, 20);
        for (const chat of individuais) {
            const msgs = await chat.fetchMessages({ limit: 10 });
            for (const msg of msgs) {
                if (!msg.body) continue;
                const peerId = msg.fromMe ? msg.to : msg.from;
                mensagensRecebidas.push({
                    id: msg.id.id,
                    de: peerId.replace('@c.us', '').replace('@lid', ''),
                    de_raw: peerId,
                    fromMe: msg.fromMe,
                    nome: chat.name || peerId,
                    texto: msg.body,
                    horario: new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: msg.timestamp
                });
            }
        }
        io.emit('init_messages', mensagensRecebidas);
    } catch (err) { }
});

client.on('authenticated', () => io.emit('status_update', { status: 'autenticado' }));

// ==========================================
// RECEBER MENSAGENS (TUDO)
// ==========================================
client.on('message_create', async (msg) => {
    const peerId = msg.fromMe ? msg.to : msg.from;
    if (peerId.includes('@g.us')) return;
    if (msg.isStatus) return;

    const contato = await client.getContactById(peerId).catch(() => null);
    const nome = contato?.name || contato?.pushname || peerId.replace('@c.us', '');

    const novaMsg = {
        id: msg.id.id,
        de: peerId.replace('@c.us', '').replace('@lid', ''),
        de_raw: peerId,
        fromMe: msg.fromMe,
        nome: nome,
        texto: msg.body,
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now() / 1000
    };

    mensagensRecebidas.unshift(novaMsg);
    if (mensagensRecebidas.length > 200) mensagensRecebidas.pop();

    // Transmite instantaneamente
    io.emit('nova_mensagem', novaMsg);

    // Contexto IA
    if (iaAtivaPorContato[peerId]) {
        if (!chatHistoryIA[peerId]) {
            chatHistoryIA[peerId] = [{ role: "system", content: "Você é a IA da SVG Multimídia. Gerencie a conversa de forma natural, curta e direta. Quebre objeções." }];
        }
        chatHistoryIA[peerId].push({ role: msg.fromMe ? "assistant" : "user", content: msg.body });
        if (chatHistoryIA[peerId].length > 15) chatHistoryIA[peerId].splice(1, 1);

        if (!msg.fromMe) {
            gerarSugestaoETransmitir(peerId);
        }
    }
});

// Função IA Realtime
async function gerarSugestaoETransmitir(id_raw) {
    try {
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: chatHistoryIA[id_raw],
        }, {
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json"
            }
        });
        const sugestao = response.data.choices[0].message.content;
        io.emit('ia_sugestao', { id_raw, sugestao });
    } catch (err) {
        console.error('Erro na IA:', err.message);
    }
}

// REST endpoints para compatibilidade e toggle
app.get('/api/status', async (req, res) => {
    if (isConnected) return res.json({ status: 'conectado' });
    if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        return res.json({ status: 'aguardando_qr', qr_code_imagem: qrImage });
    }
    return res.json({ status: 'iniciando' });
});

app.get('/api/mensagens', (req, res) => res.json(mensagensRecebidas));
app.get('/api/ia/status', (req, res) => res.json(iaAtivaPorContato));

app.post('/api/ia/toggle', (req, res) => {
    const { id_raw, enable } = req.body;
    iaAtivaPorContato[id_raw] = !!enable;
    res.json({ sucesso: true, ativa: iaAtivaPorContato[id_raw] });
});

app.get('/api/ia/sugerir', async (req, res) => {
    const { id_raw } = req.query;
    if (!chatHistoryIA[id_raw]) {
        try {
            const chat = await client.getChatById(id_raw);
            const msgs = await chat.fetchMessages({ limit: 5 });
            chatHistoryIA[id_raw] = [{ role: "system", content: "IA SVG Multimídia." }];
            msgs.forEach(m => chatHistoryIA[id_raw].push({ role: m.fromMe ? "assistant" : "user", content: m.body }));
        } catch { }
    }
    gerarSugestaoETransmitir(id_raw);
    res.json({ pendente: true });
});

app.get('/api/foto', async (req, res) => {
    try {
        const url = await client.getProfilePicUrl(req.query.id);
        res.json({ url });
    } catch { res.json({ url: null }); }
});

app.post('/api/enviar', async (req, res) => {
    const { de_raw, mensagem } = req.body;
    try {
        await client.sendMessage(de_raw, mensagem);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/enviar-midia', async (req, res) => {
    const { de_raw, base64data, mimetype, filename, legend } = req.body;
    try {
        const pureBase64 = base64data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        const media = new MessageMedia(mimetype, pureBase64, filename || 'arquivo');
        await client.sendMessage(de_raw, media, { caption: legend });
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/desconectar', async (req, res) => {
    try { await client.logout(); isConnected = false; qrCodeData = ''; res.json({ sucesso: true }); } catch { res.status(500).send(); }
});

const PORT = 3001;
server.listen(PORT, () => console.log('🚀 Server Realtime na 3001'));
client.initialize();
