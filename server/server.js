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
                console.log(`📩 [SOCKET] Nova mensagem emitida: ${novaMsg.id} de ${novaMsg.nome}`);
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
        console.log('✅ WhatsApp CONECTADO - Pronto para interagir');
        isConnected = true;
        qrCodeData = '';

        // Emite status IMEDIATAMENTE para liberar o frontend
        io.emit('status_update', { status: 'conectado' });

        // 1. Limpa lixo anterior
        contatosSalvos = [];
        mensagensRecebidas = [];

        try {
            console.log("📂 Iniciando busca de chats (getChats)...");
            const start = Date.now();
            const allChats = await client.getChats();
            console.log(`📂 Busca concluída em ${((Date.now() - start) / 1000).toFixed(1)}s. Total: ${allChats.length}`);

            // Filtramos apenas os 100 mais RECENTES e que não sejam grupos
            const recentChats = allChats
                .filter(c => c && c.id && c.id._serialized && !c.id._serialized.includes('@g.us'))
                .slice(0, 100);

            console.log(`📂 Sincronizando os ${recentChats.length} chats mais recentes...`);

            // 3. Carga Rápida Inicial (Apenas o que já temos no chat object)
            contatosSalvos = recentChats.map(c => ({
                id: c.id._serialized,
                name: c.name || c.id.user,
                number: c.id.user,
                foto: null,
                lastMessageTimestamp: c.timestamp * 1000,
                lastMessageText: "",
                lastMessageFromMe: false,
                lastMessageTime: new Date(c.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }));

            // Destrava a tela IMEDIATAMENTE
            io.emit('init_contacts', contatosSalvos);

            // 4. Processamento em Lotes (Paralelo controlado para não travar o Puppeteer)
            const processBatch = async (batch) => {
                await Promise.all(batch.map(async (c) => {
                    try {
                        const chatObj = await client.getChatById(c.id);
                        const contactObj = await client.getContactById(c.id).catch(() => null);

                        const idx = contatosSalvos.findIndex(ct => ct.id === c.id);
                        if (idx !== -1) {
                            const nomeReal = contactObj?.name || contactObj?.pushname || contactObj?.verifiedName || chatObj.name || c.number;
                            const foto = await client.getProfilePicUrl(c.id).catch(() => null);

                            contatosSalvos[idx].name = nomeReal;
                            contatosSalvos[idx].foto = foto;

                            const msgs = await chatObj.fetchMessages({ limit: 40 }).catch(() => []);
                            if (msgs.length > 0) {
                                const last = msgs[msgs.length - 1];
                                contatosSalvos[idx].lastMessageText = last.body || _tipoMensagem(last.type);
                                contatosSalvos[idx].lastMessageFromMe = last.fromMe;
                                contatosSalvos[idx].lastMessageTime = new Date(last.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                contatosSalvos[idx].lastMessageTimestamp = last.timestamp * 1000;

                                for (const m of msgs) {
                                    await processarMensagemSync(m, foto, nomeReal);
                                }
                            }
                            // Emite atualização do contato individualmente se quiser, 
                            // ou emite a lista completa a cada batch
                        }
                    } catch (e) {
                        console.error(`Erro no contato ${c.id}:`, e.message);
                    }
                }));
            };

            // Divide em lotes de 10 para performance
            const batchSize = 10;
            for (let i = 0; i < recentChats.length; i += batchSize) {
                const batch = recentChats.slice(i, i + batchSize);
                await processBatch(batch);
                io.emit('init_contacts', contatosSalvos);
                io.emit('init_messages', mensagensRecebidas);
            }

            console.log("✅ Sincronização completa concluída.");
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

    // --- MOTOR DE IA (GROQ / OPENAI) ---
    async function gerarRespostaIA(peerId, textoMensagem) {
        try {
            if (!iaAtivaPorContato[peerId]) return;

            // Mantém mini-histórico para contexto (últimas 6 msgs)
            if (!chatHistoryIA[peerId]) chatHistoryIA[peerId] = [];
            chatHistoryIA[peerId].push({ role: 'user', content: textoMensagem });
            if (chatHistoryIA[peerId].length > 6) chatHistoryIA[peerId].shift();

            console.log(`🤖 IA pensando para ${peerId}...`);

            // Aqui você deve colocar sua chave no .env: GROQ_API_KEY
            const apiKey = process.env.GROQ_API_KEY;

            if (!apiKey) {
                console.log("⚠️ GROQ_API_KEY não configurada. Usando resposta simulada.");
                const respostaSimulada = "Olá! Esta é uma resposta automática inteligente (Modo Simulação). Para ativar a IA real, configure a GROQ_API_KEY no seu servidor.";

                // Envia como sugestão primeiro
                io.emit('ia_sugestao', { id_raw: peerId, sugestao: respostaSimulada });

                // Se quiser que responda SOZINHO (Auto-reply), descomente abaixo:
                // await client.sendMessage(peerId, respostaSimulada);
                return;
            }

            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.1-70b-versatile",
                messages: [
                    { role: "system", content: "Você é um assistente comercial inteligente do Consuflow. Seja cordial, direto e ajude o cliente com suas dúvidas sobre serviços de pintura e consultoria. Use emojis moderadamente." },
                    ...chatHistoryIA[peerId]
                ]
            }, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            const respostaFinal = response.data.choices[0].message.content;
            chatHistoryIA[peerId].push({ role: 'assistant', content: respostaFinal });

            // Emite a sugestão para o painel do usuário ver (Tempo Real)
            io.emit('ia_sugestao', { id_raw: peerId, sugestao: respostaFinal });

            // Auto-reply: Se estiver ativo, ele envia direto
            // await client.sendMessage(peerId, respostaFinal);

        } catch (err) {
            console.error("Erro na IA:", err.message);
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
        // Processa para a lista e interface
        await processarMensagem(msg, true);

        // Se for mensagem recebida (não minha), tenta disparar IA
        if (!msg.fromMe) {
            const peerId = msg.from;
            if (iaAtivaPorContato[peerId]) {
                await gerarRespostaIA(peerId, msg.body);
            }
        }
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
    // Garante que o frontend receba o cache atual IMEDIATAMENTE ao conectar
    if (contatosSalvos.length > 0) socket.emit('init_contacts', contatosSalvos);
    if (mensagensRecebidas.length > 0) socket.emit('init_messages', mensagensRecebidas);
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
    try {
        const msg = await client.sendMessage(req.body.de_raw, req.body.mensagem);
        // Opcional: Processa a mensagem enviada imediatamente para o cache
        await processarMensagem(msg, true);
        res.json({ ok: true });
    } catch (e) {
        console.error("Erro ao enviar mensagem:", e);
        res.status(500).send();
    }
});

app.post('/api/enviar-midia', async (req, res) => {
    try {
        const { de_raw, base64data, mimetype, filename } = req.body;
        // O base64 vem tipicamente como "data:image/png;base64,iVBORw..."
        const base64Clean = base64data.split(',')[1] || base64data;
        const media = new MessageMedia(mimetype, base64Clean, filename);
        const msg = await client.sendMessage(de_raw, media);
        await processarMensagem(msg, true);
        res.json({ ok: true });
    } catch (e) {
        console.error("Erro ao enviar mídia:", e);
        res.status(500).send();
    }
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
