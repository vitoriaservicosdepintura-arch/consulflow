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
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            headless: true,
            executablePath: process.env.CHROMIUM_PATH || undefined, // Removido fixo de linux para funcionar no windows automaticamente
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
            const nome = contato?.name || contato?.pushname || peerId.replace('@c.us', '');

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
                if (mensagensRecebidas.length > 2000) mensagensRecebidas.pop(); // Aumentado limite de cache

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
        console.log('✅ WhatsApp PRONTO E CONECTADO!');
        isConnected = true;
        qrCodeData = '';
        io.emit('status_update', { status: 'conectado' });

        try {
            console.log("⚡ Sincronização FLASH MASTER Iniciada...");

            const chats = await client.getChats();
            console.log(`📂 Processando ${chats.length} conversas...`);

            // Limpa mensagens locais
            mensagensRecebidas = [];

            // CARGA FLASH: Processa os 60 chats mais recentes com resumo imediato
            const enrichedChats = await Promise.all(chats.slice(0, 60).map(async (chat) => {
                const peerId = chat.id._serialized;
                if (!peerId || peerId.includes('@g.us')) return null;

                try {
                    const foto = await client.getProfilePicUrl(peerId).catch(() => null);
                    // Pega apenas a ULTIMA mensagem para o resumo inicial (muito rápido)
                    const lastMsgs = await chat.fetchMessages({ limit: 1 }).catch(() => []);
                    const lastMsg = lastMsgs[0];

                    if (lastMsg) {
                        await processarMensagemSync(lastMsg, foto);
                    }

                    return {
                        id: peerId,
                        name: chat.name || "Sem Nome",
                        number: peerId.split('@')[0],
                        foto: foto,
                        lastMessageTimestamp: chat.timestamp || 0,
                        lastMessageText: lastMsg ? lastMsg.body : "",
                        lastMessageFromMe: lastMsg ? lastMsg.fromMe : false
                    };
                } catch (e) {
                    return { id: peerId, name: chat.name || "Sem Nome", number: peerId.split('@')[0], foto: null, lastMessageTimestamp: chat.timestamp || 0 };
                }
            }));

            const finalInitialList = enrichedChats.filter(c => c !== null);
            contatosSalvos = finalInitialList;

            // Envia TUDO pronto pro front em 1 segundo
            io.emit('init_contacts', finalInitialList);
            io.emit('init_messages', mensagensRecebidas);

            // CARGA PROFUNDA: Busca o resto do histórico sem pressa
            for (const cShort of finalInitialList) {
                (async () => {
                    try {
                        const chat = await client.getChatById(cShort.id);
                        const messages = await chat.fetchMessages({ limit: 20 });
                        for (const msg of messages) {
                            await processarMensagemSync(msg, cShort.foto);
                        }
                        io.emit('init_messages', mensagensRecebidas);
                    } catch (e) { }
                })();
            }

            // Agenda passiva
            const contacts = await client.getContacts().catch(() => []);
            contacts.forEach(c => {
                if (c && c.id && !c.id._serialized.includes('@g.us')) {
                    if (!contatosSalvos.find(cs => cs.id === c.id._serialized)) {
                        contatosSalvos.push({ id: c.id._serialized, name: c.name || "Sem Nome", number: c.id.user, foto: null, lastMessageTimestamp: 0 });
                    }
                }
            });
            io.emit('init_contacts', contatosSalvos);

        } catch (err) {
            console.error("Erro na sincronização Master:", err);
        }
    });

    async function processarMensagemSync(msg, fotoUrl) {
        const peerId = msg.fromMe ? msg.to : msg.from;
        if (!peerId || peerId.includes('@g.us')) return;

        const contato = await client.getContactById(peerId).catch(() => null);
        const nome = contato?.name || contato?.pushname || peerId.replace('@c.us', '');

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
            media: null // Por performance, não baixar mídia no sync inicial
        };

        if (!mensagensRecebidas.some(m => m.id === novaMsg.id)) {
            mensagensRecebidas.push(novaMsg);
            mensagensRecebidas.sort((a, b) => b.timestamp - a.timestamp);
        }
    }

    app.get('/api/contatos', async (req, res) => {
        try {
            const contacts = await client.getContacts();
            const simplified = contacts
                .filter(c => c.id && c.id._serialized && !c.id._serialized.includes('@g.us'))
                .map(c => ({
                    id: c.id._serialized,
                    name: c.name || c.pushname || c.number || "Sem Nome",
                    number: c.number || (c.id ? c.id.user : ""),
                    foto: null
                }));
            res.json(simplified);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    client.on('presence_update', async (presence) => {
        const id_raw = presence.id._serialized;
        const type = presence.type; // 'online', 'offline', 'typing', 'recording'
        const isOnline = type === 'online';

        console.log(`[Presence] Atualização capturada para ${id_raw}: ${type}`);

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
    }, 5000);
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
        console.log("♻️ Solicitando desconexão profunda...");

        // Resposta imediata para o frontend não travar
        res.json({ ok: true });

        isConnected = false;
        qrCodeData = '';
        mensagensRecebidas = [];
        contatosSalvos = []; // Limpa a agenda ao desconectar

        io.emit('status_update', { status: 'iniciando' });
        io.emit('init_messages', []);
        io.emit('init_contacts', []);

        if (client) {
            console.log("🛑 Finalizando cliente WhatsApp...");
            // Tenta logout e destroy, mas não espera eternamente (catch resolve rápido)
            await Promise.race([
                client.logout().catch(() => { }),
                new Promise(resolve => setTimeout(resolve, 3000))
            ]);
            await client.destroy().catch(() => { });
        }

        const authPath = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            console.log("📂 Removendo pasta de autenticação...");
            try {
                // Pequeno delay para garantir que o Chrome soltou os arquivos
                setTimeout(() => {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    console.log("✅ Limpeza de cache concluída. Reiniciando...");
                    initWhatsApp();
                }, 1000);
            } catch (err) {
                console.error("Erro ao remover pasta auth:", err.message);
                initWhatsApp(); // Reinicia mesmo se falhar a limpeza
            }
        } else {
            initWhatsApp();
        }

    } catch (e) {
        console.error("Erro na rota de desconexão:", e);
        if (!res.headersSent) res.status(500).send();
    }
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
    console.log(`🚀 Server Multimedia na ${PORT}`); // Ajustado para bater com os logs do usuário
    initWhatsApp();
});
