const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ==========================================
// CORS — permite o frontend em qualquer origem
// ==========================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

let qrCodeData = '';
let isConnected = false;
let mensagensRecebidas = [];

// ==========================================
// DETECÇÃO AUTOMÁTICA DO CHROME / CHROMIUM
// ==========================================
function getChromeExecutable() {
    const possiblePaths = [
        // Windows — Chrome
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        // Windows — Edge (fallback)
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        // Linux
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        // macOS
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];

    for (const p of possiblePaths) {
        try {
            if (fs.existsSync(p)) {
                console.log('✅ Browser encontrado:', p);
                return p;
            }
        } catch { }
    }

    console.log('⚠️  Chrome não encontrado nos caminhos padrão. Usando Chromium do puppeteer.');
    return null; // puppeteer usa o próprio Chromium
}

const executablePath = getChromeExecutable();

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

// Só adiciona executablePath se encontrou o Chrome
if (executablePath) {
    clientConfig.puppeteer.executablePath = executablePath;
}

const client = new Client(clientConfig);

// ==========================================
// EVENTOS DO CLIENTE
// ==========================================
client.on('qr', async (qr) => {
    console.log('📱 Novo QR Code gerado! Escaneie no painel.');
    qrCodeData = qr;
    isConnected = false;
});

client.on('ready', async () => {
    console.log('✅ WhatsApp conectado com sucesso!');
    isConnected = true;
    qrCodeData = '';

    // =============================================
    // Carregar conversas existentes do WhatsApp
    // =============================================
    try {
        console.log('📂 Carregando chats existentes...');
        const chats = await client.getChats();

        // Filtra grupos e pega os últimos 30 chats individuais
        const individuais = chats
            .filter(c => !c.isGroup)
            .slice(0, 30);

        const novasMensagens = [];

        for (const chat of individuais) {
            try {
                const msgs = await chat.fetchMessages({ limit: 10 });
                for (const msg of msgs) {
                    if (!msg.body) continue;
                    const contato = await msg.getContact().catch(() => null);
                    const nome = contato?.pushname || contato?.name || chat.name || chat.id.user;

                    novasMensagens.push({
                        id: msg.id.id,
                        de: msg.from.replace('@c.us', '').replace('@lid', ''),
                        de_raw: msg.from,
                        nome: nome,
                        texto: msg.body,
                        horario: new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR'),
                        timestamp: msg.timestamp
                    });
                }
            } catch (e) {
                // ignora erros em chats individuais
            }
        }

        // Ordena do mais recente ao mais antigo
        novasMensagens.sort((a, b) => b.timestamp - a.timestamp);

        // Mescla com mensagens reais capturadas ao vivo (evita duplicatas)
        const idsExistentes = new Set(mensagensRecebidas.map(m => m.id));
        for (const m of novasMensagens) {
            if (!idsExistentes.has(m.id)) {
                mensagensRecebidas.push(m);
            }
        }

        console.log(`📂 ${novasMensagens.length} mensagens carregadas de ${individuais.length} chats.`);
    } catch (err) {
        console.error('⚠️ Erro ao carregar chats:', err.message);
    }
});

client.on('authenticated', () => {
    console.log('🔐 Autenticado!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    isConnected = false;
});

client.on('disconnected', (reason) => {
    console.log('⚠️  WhatsApp desconectado:', reason);
    isConnected = false;
    // Tenta reconectar após 10 segundos
    setTimeout(() => {
        console.log('🔄 Tentando reconectar...');
        client.initialize().catch(console.error);
    }, 10000);
});

// ==========================================
// RECEBER MENSAGENS
// ==========================================
client.on('message', async (msg) => {
    // Ignora mensagens de grupos
    if (msg.from.includes('@g.us')) return;

    const contato = await msg.getContact().catch(() => null);
    const nome = contato?.pushname || contato?.name || msg.from.replace('@c.us', '');

    console.log(`💬 Mensagem de ${nome}: ${msg.body}`);

    mensagensRecebidas.unshift({
        id: msg.id.id,
        de: msg.from.replace('@c.us', '').replace('@lid', ''),
        de_raw: msg.from,  // ID completo para envio confiável
        nome: nome,
        texto: msg.body,
        horario: new Date().toLocaleTimeString('pt-BR'),
        timestamp: Date.now()
    });

    // Limita a 100 mensagens
    if (mensagensRecebidas.length > 100) mensagensRecebidas.pop();
});

// ==========================================
// INICIALIZAÇÃO SEGURA COM RETRY
// ==========================================
async function startWhatsApp(tentativa = 1) {
    try {
        console.log(`🚀 Iniciando WhatsApp (tentativa ${tentativa})...`);
        await client.initialize();
    } catch (erro) {
        console.error(`❌ Erro na inicialização (tentativa ${tentativa}):`, erro.message);
        const delay = Math.min(tentativa * 10000, 60000); // máx 60s
        console.log(`⏳ Tentando novamente em ${delay / 1000}s...`);
        setTimeout(() => startWhatsApp(tentativa + 1), delay);
    }
}

startWhatsApp();

// ==========================================
// ROTAS DA API
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Status + QR Code
app.get('/api/status', async (req, res) => {
    if (isConnected) {
        return res.json({ status: 'conectado' });
    }
    if (qrCodeData) {
        try {
            const qrImage = await qrcode.toDataURL(qrCodeData);
            return res.json({ status: 'aguardando_qr', qr_code_imagem: qrImage });
        } catch {
            return res.json({ status: 'aguardando_qr' });
        }
    }
    return res.json({ status: 'iniciando' });
});

// Mensagens recebidas
app.get('/api/mensagens', (req, res) => {
    res.json(mensagensRecebidas);
});

// Foto de perfil
app.get('/api/foto', async (req, res) => {
    if (!isConnected) return res.json({ url: null });
    const { id } = req.query;
    if (!id) return res.json({ url: null });
    try {
        const url = await client.getProfilePicUrl(id);
        res.json({ url });
    } catch (error) {
        res.json({ url: null });
    }
});

// Enviar mensagem
app.post('/api/enviar', async (req, res) => {
    const { numero, mensagem, de_raw } = req.body;

    if (!isConnected) {
        return res.status(400).json({ erro: 'WhatsApp não está conectado.' });
    }
    if (!numero || !mensagem) {
        return res.status(400).json({ erro: 'Campos "numero" e "mensagem" são obrigatórios.' });
    }

    try {
        // Usa o de_raw se fornecido (contém @c.us ou @lid correto)
        let destino = de_raw || numero;
        if (!destino.includes('@')) {
            destino = `${destino.replace(/\D/g, '')}@c.us`;
        }
        await client.sendMessage(destino, mensagem);
        res.json({ sucesso: true, mensagem: 'Mensagem enviada!' });
    } catch (erro) {
        console.error('ERRO AO ENVIAR MENSAGEM:', erro);
        res.status(500).json({ erro: 'Falha ao enviar', detalhe: erro.message });
    }
});

// Desconectar / Gerar novo QR
app.post('/api/desconectar', async (req, res) => {
    try {
        if (isConnected) {
            await client.logout();
        }
        isConnected = false;
        qrCodeData = '';
        res.json({ sucesso: true, mensagem: 'Desconectado. Gerando novo QR...' });
        // Reinicializa após responder
        setTimeout(() => {
            client.initialize().catch(console.error);
        }, 2000);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao desconectar.' });
    }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log(`║  Consuflow API rodando na porta ${PORT}   ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('Rotas disponíveis:');
    console.log(`  GET  http://localhost:${PORT}/api/status`);
    console.log(`  GET  http://localhost:${PORT}/api/mensagens`);
    console.log(`  POST http://localhost:${PORT}/api/enviar`);
    console.log(`  POST http://localhost:${PORT}/api/desconectar`);
    console.log('');
});
