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
    transports: ['polling', 'websocket'],
    maxHttpBufferSize: 1e8
});

app.use(cors());
app.use(express.json({ limit: '100mb' }));

let qrCodeData = '';
let isConnected = false;
let mensagensRecebidas = [];
let iaAtivaPorContato = {};
let chatHistoryIA = {};
let contatosSalvos = [];
let client;

async function getStatus() {
    if (isConnected) return { status: 'conectado' };
    if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        return { status: 'aguardando_qr', qr_code_imagem: qrImage };
    }
    return { status: 'iniciando' };
}

function initWhatsApp() {
    console.log("🛠️ Inicializando WhatsApp...");
    qrCodeData = '';
    isConnected = false;

    client = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1021105994-alpha.html',
        },
        puppeteer: {
            headless: true,
            executablePath: process.env.CHROMIUM_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    async function processarMensagem(msg, emitir = true) {
        try {
            const peerId = msg.fromMe ? msg.to : msg.from;
            if (!peerId || peerId.includes('@g.us')) return;

            const contato = await client.getContactById(peerId).catch(() => null);
            const nome = contato?.name || contato?.pushname || contato?.verifiedName || peerId.replace('@c.us', '');

            let fotoUrl = null;
            try {
                // Tenta pegar do cache ou busca se não tiver
                fotoUrl = await client.getProfilePicUrl(peerId).catch(() => null);
            } catch (e) { }

            let mediaData = null;
            if (msg.hasMedia && emitir) {
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
                foto: fotoUrl,
                texto: msg.body,
                horario: new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                timestamp: msg.timestamp,
                type: msg.type,
                hasMedia: msg.hasMedia,
                media: mediaData
            };

            const index = mensagensRecebidas.findIndex(m => m.id === novaMsg.id);
            if (index === -1) {
                mensagensRecebidas.push(novaMsg);
                mensagensRecebidas.sort((a, b) => b.timestamp - a.timestamp);
                if (mensagensRecebidas.length > 2000) mensagensRecebidas.pop();

                if (emitir) io.emit('nova_mensagem', novaMsg);
            }
        } catch (err) {
            console.error("Erro ao processar mensagem:", err.message);
        }
    }

    client.on('qr', async (qr) => {
        console.log("📲 QR Gerado");
        qrCodeData = qr;
        const qrImage = await qrcode.toDataURL(qr);
        io.emit('status_update', { status: 'aguardando_qr', qr_code_imagem: qrImage });
    });

    client.on('ready', async () => {
        console.log('✅ WhatsApp CONECTADO - Apenas Chats Recentes');
        isConnected = true;
        qrCodeData = '';

        // 1. Limpa tudo para garantir que não tenha lixo da agenda anterior
        contatosSalvos = [];
        mensagensRecebidas = [];

        try {
            // 2. Busca APENAS os chats (Conversas Ativas)
            const allChats = await client.getChats();

            // Filtramos apenas os 50 mais RECENTES e que não sejam grupos
            const recentChats = allChats
                .filter(c => c && c.id && c.id._serialized && !c.id._serialized.includes('@g.us'))
                .slice(0, 50);

            console.log(`📂 Sincronizando apenas os ${recentChats.length} chats mais recentes...`);

            // 3. Carga Ultra-Rápida de Resumo
            contatosSalvos = recentChats.map(c => ({
                id: c.id._serialized,
                name: c.name || "Sem Nome",
                number: c.id.user,
                foto: null,
                lastMessageTimestamp: c.timestamp * 1000,
                lastMessageText: "",
                lastMessageFromMe: false,
                lastMessageTime: new Date(c.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }));

            // Destrava a tela IMEDIATAMENTE com os nomes básicos
            io.emit('status_update', { status: 'conectado' });
            io.emit('init_contacts', contatosSalvos);

            // 4. Preenchimento de Detalhes em Background (nome real, foto, histórico com mídia)
            (async () => {
                for (let i = 0; i < contatosSalvos.length; i++) {
                    const c = contatosSalvos[i];
                    try {
                        const chatObj = await client.getChatById(c.id);
                        const contatoInfo = await client.getContactById(c.id).catch(() => null);
                        const nomeReal = contatoInfo?.name || contatoInfo?.pushname || contatoInfo?.verifiedName || c.name || c.number;
                        const foto = await client.getProfilePicUrl(c.id).catch(() => null);

                        contatosSalvos[i].name = nomeReal;
                        contatosSalvos[i].foto = foto;

                        const msgs = await chatObj.fetchMessages({ limit: 30 }).catch(() => []);
                        if (msgs.length > 0) {
                            const last = msgs[msgs.length - 1];
                            contatosSalvos[i].lastMessageText = last.body || _tipoMensagem(last.type);
                            contatosSalvos[i].lastMessageFromMe = last.fromMe;
                            contatosSalvos[i].lastMessageTime = new Date(last.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            contatosSalvos[i].lastMessageTimestamp = last.timestamp * 1000;

                            for (const m of msgs) {
                                await processarMensagemSync(m, foto, nomeReal);
                            }
                        }
                        io.emit('init_contacts', contatosSalvos);
                        io.emit('init_messages', mensagensRecebidas);
                    } catch (e) {
                        console.error(`Erro contato ${c.id}:`, e.message);
                    }
                }
                console.log("✅ Sincronização completa com mídia concluída.");
            })();
        } catch (err) {
            console.error("Erro na sincronização:", err);
            io.emit('status_update', { status: 'conectado' });
        }
    });

    // Helper: descrição textual para tipos de mídia
    function _tipoMensagem(type) {
        const tipos = {
            'image': '📷 Foto', 'video': '🎥 Vídeo', 'audio': '🎵 Áudio',
            'ptt': '🎤 Mensagem de voz', 'document': '📄 Documento',
            'sticker': '🎭 Sticker', 'call_log': '📞 Chamada',
            'e2e_notification': '🔒 Mensagem segura', 'location': '📍 Localização',
        };
        return tipos[type] || '📎 Mídia';
    }

    async function processarMensagemSync(msg, fotoUrl, nomeContato) {
        const peerId = msg.fromMe ? msg.to : msg.from;
        if (!peerId || peerId.includes('@g.us')) return;

        const contatoExistente = contatosSalvos.find(c => c.id === peerId);

        if (contatoExistente) {
            let mediaData = null;
            const tiposMidia = ['image', 'video', 'audio', 'ptt', 'document', 'sticker'];
            if (msg.hasMedia && tiposMidia.includes(msg.type)) {
                try {
                    const media = await msg.downloadMedia().catch(() => null);
                    if (media) {
                        mediaData = {
                            mimetype: media.mimetype,
                            data: media.data,
                            filename: media.filename || null
                        };
                    }
                } catch (e) { }
            }

            const textoExibivel = msg.body || (msg.hasMedia ? _tipoMensagem(msg.type) : '');

            const novaMsg = {
                id: msg.id.id,
                de_raw: peerId,
                fromMe: msg.fromMe,
                nome: nomeContato || contatoExistente.name,
                foto: fotoUrl || contatoExistente.foto,
                texto: textoExibivel,
                horario: new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                timestamp: msg.timestamp,
                type: msg.type,
                hasMedia: msg.hasMedia,
                media: mediaData
            };

            if (!mensagensRecebidas.some(m => m.id === novaMsg.id)) {
                mensagensRecebidas.push(novaMsg);
                mensagensRecebidas.sort((a, b) => b.timestamp - a.timestamp);
            }
        }
    }

    client.on('presence_update', async (presence) => {
        const id_raw = presence.id._serialized;
        const type = presence.type;
        const isOnline = type === 'online';

        let lastSeenFormatted = null;
        if (type === 'offline') {
            const contact = await client.getContactById(id_raw).catch(() => null);
            const contactPresence = await contact?.getPresence().catch(() => null);
            if (contactPresence?.lastSeen) {
                const date = new Date(contactPresence.lastSeen * 1000);
                lastSeenFormatted = `hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            }
        }

        io.emit('presenca_update', {
            id_raw: id_raw,
            isOnline: isOnline,
            lastSeen: lastSeenFormatted
        });
    });

    client.on('auth_failure', () => {
        console.log('❌ Falha Auth');
        qrCodeData = ''; isConnected = false;
        io.emit('status_update', { status: 'erro' });
    });

    client.on('message_create', async (msg) => {
        await processarMensagem(msg, true);
    });

    setTimeout(() => {
        client.initialize().catch((err) => {
            console.error('ERRO Puppeteer:', err.message);
            io.emit('status_update', { status: 'erro', mensagem: err.message });
        });
    }, 8000);
}

io.on('connection', async (socket) => {
    socket.emit('status_update', await getStatus());
    if (mensagensRecebidas.length > 0) socket.emit('init_messages', mensagensRecebidas);
    if (contatosSalvos.length > 0) socket.emit('init_contacts', contatosSalvos);
});

app.get('/api/status', async (req, res) => res.json(await getStatus()));
app.get('/api/mensagens', (req, res) => res.json(mensagensRecebidas));

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
        res.json({ ok: true });
        isConnected = false;
        qrCodeData = '';
        mensagensRecebidas = [];
        contatosSalvos = [];
        io.emit('status_update', { status: 'iniciando' });
        io.emit('init_messages', []);
        io.emit('init_contacts', []);

        if (client) {
            await Promise.race([
                client.logout().catch(() => { }),
                new Promise(resolve => setTimeout(resolve, 3000))
            ]);
            await client.destroy().catch(() => { });
        }

        const authPath = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            setTimeout(() => {
                fs.rmSync(authPath, { recursive: true, force: true });
                initWhatsApp();
            }, 1000);
        } else {
            initWhatsApp();
        }
    } catch (e) {
        console.error("Erro na rota de desconexão:", e);
        if (!res.headersSent) res.status(500).send();
    }
});

app.post('/api/reset-session', async (req, res) => {
    try {
        res.json({ ok: true, msg: 'Reset iniciado' });
        isConnected = false;
        qrCodeData = '';
        mensagensRecebidas = [];
        contatosSalvos = [];
        io.emit('status_update', { status: 'iniciando' });
        io.emit('init_messages', []);
        io.emit('init_contacts', []);

        if (client) {
            await client.destroy().catch(() => { });
        }

        await new Promise(r => setTimeout(r, 3000));
        const authPath = path.join(__dirname, '.wwebjs_auth');
        const cachePath = path.join(__dirname, '.wwebjs_cache');
        [authPath, cachePath].forEach(p => {
            if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
        });
        setTimeout(() => initWhatsApp(), 2000);
    } catch (e) { }
});

app.options('*', cors());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server Multimedia na ${PORT}`);
    initWhatsApp();
});
