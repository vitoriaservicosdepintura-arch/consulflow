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
const io = new Server(server, { core: { origin: "*" }, maxHttpBufferSize: 1e8 });

app.use(cors());
app.use(express.json({ limit: '100mb' }));

let qrCodeData = '';
let isConnected = false;
let mensagensRecebidas = [];
let iaAtivaPorContato = {};
let chatHistoryIA = {};
let client;

function initWhatsApp() {
    console.log("🛠️ Inicializando instância do WhatsApp...");
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', async (qr) => {
        qrCodeData = qr; isConnected = false;
        const qrImage = await qrcode.toDataURL(qr);
        io.emit('status_update', { status: 'aguardando_qr', qr_code_imagem: qrImage });
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp Pronto!');
        isConnected = true; qrCodeData = '';
        io.emit('status_update', { status: 'conectado' });
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
                if (media) mediaData = { mimetype: media.mimetype, data: media.data, filename: media.filename };
            } catch (e) { }
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
        if (!msg.fromMe) io.emit('presenca_update', { id_raw: peerId, isOnline: true, lastSeen: null });

        if (iaAtivaPorContato[peerId] && msg.body && !msg.fromMe) {
            if (!chatHistoryIA[peerId]) chatHistoryIA[peerId] = [{ role: "system", content: "IA SVG Multimídia. Resposta curta." }];
            chatHistoryIA[peerId].push({ role: "user", content: msg.body });
            gerarSugestao(peerId);
        }
    });

    client.on('presence_update', (data) => {
        const id = data.id?._serialized || data.id;
        const isOnline = data.type === 'available';
        io.emit('presenca_update', { id_raw: id, isOnline: isOnline, lastSeen: !isOnline ? Date.now() / 1000 : null });
    });

    client.initialize().catch(err => console.error("Erro Init:", err));
}

async function gerarSugestao(id_raw) {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: chatHistoryIA[id_raw],
        }, { headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` } });
        io.emit('ia_sugestao', { id_raw, sugestao: response.data.choices[0].message.content });
    } catch (e) { }
}

app.get('/api/status', async (req, res) => {
    const qrImage = qrCodeData ? await qrcode.toDataURL(qrCodeData) : null;
    res.json({ status: isConnected ? 'conectado' : (qrCodeData ? 'aguardando_qr' : 'iniciando'), qr_code_imagem: qrImage });
});

app.get('/api/mensagens', (req, res) => res.json(mensagensRecebidas));
app.get('/api/ia/status', (req, res) => res.json(iaAtivaPorContato));
app.post('/api/ia/toggle', (req, res) => {
    iaAtivaPorContato[req.body.id_raw] = !!req.body.enable;
    res.json({ ativa: iaAtivaPorContato[req.body.id_raw] });
});

app.get('/api/foto', async (req, res) => {
    try { res.json({ url: await client.getProfilePicUrl(req.query.id) }); } catch { res.json({ url: null }); }
});

app.get('/api/presenca', async (req, res) => {
    try {
        const id = req.query.id;
        await client.subscribePresence(id).catch(() => { });
        const contact = await client.getContactById(id);
        const presence = await contact.getPresence();
        let lastSeenFormatted = null;
        if (presence.lastSeen) {
            const date = new Date(presence.lastSeen * 1000);
            lastSeenFormatted = `hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
        res.json({ isOnline: presence.isOnline === true, lastSeen: lastSeenFormatted });
    } catch { res.json({ isOnline: false, lastSeen: null }); }
});

app.post('/api/enviar', async (req, res) => {
    try { await client.sendMessage(req.body.de_raw, req.body.mensagem); res.json({ ok: true }); } catch (e) { res.status(500).send(); }
});

app.post('/api/desconectar', async (req, res) => {
    try {
        console.log("♻️ Reiniciando conexão...");
        await client.logout().catch(() => { });
        await client.destroy().catch(() => { });

        const authPath = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

        isConnected = false; qrCodeData = ''; mensagensRecebidas = [];
        io.emit('status_update', { status: 'iniciando' });
        io.emit('init_messages', []);

        res.json({ ok: true });
        initWhatsApp(); // REINICIA SEM FECHAR O PROCESSO
    } catch (e) { res.status(500).send(); }
});

server.listen(3001, () => {
    console.log('🚀 Server ON 3001');
    initWhatsApp();
});
