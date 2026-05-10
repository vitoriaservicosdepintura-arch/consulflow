const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
// Configuração de CORS permissiva para evitar erros no frontend
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

let qrCodeData = '';
let isConnected = false;
let mensagensRecebidas = []; // Array para guardar as mensagens recebidas

// Configuração do Cliente com patches de estabilidade para ambiente local
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('Novo QR Code gerado!');
    qrCodeData = qr;
});

client.on('ready', () => {
    console.log('WhatsApp conectado com sucesso!');
    isConnected = true;
    qrCodeData = '';
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason);
    isConnected = false;
});

// ==========================================
// 2. ESCUTAR MENSAGENS RECEBIDAS
// ==========================================
client.on('message', async (msg) => {
    console.log(`Mensagem de ${msg.from}: ${msg.body}`);

    // Salva a mensagem na nossa lista
    mensagensRecebidas.unshift({ // unshift para mostrar a mais recente primeiro
        id: msg.id.id,
        de: msg.from.replace('@c.us', ''), // Limpa o número
        texto: msg.body,
        horario: new Date().toLocaleTimeString()
    });

    // Limita a 50 mensagens para não pesar a memória
    if (mensagensRecebidas.length > 50) mensagensRecebidas.pop();
});

// Inicialização segura
async function startWhatsApp() {
    try {
        console.log('Inicializando WhatsApp client...');
        await client.initialize();
    } catch (erro) {
        console.error('Erro na inicialização:', erro);
        setTimeout(startWhatsApp, 15000); // Tenta novamente em 15s
    }
}
startWhatsApp();

// ==========================================
// ROTAS DA API
// ==========================================

// Rota de Status
app.get('/api/status', async (req, res) => {
    if (isConnected) return res.json({ status: 'conectado' });
    if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        return res.json({ status: 'aguardando_qr', qr_code_imagem: qrImage });
    }
    return res.json({ status: 'iniciando' });
});

// Rota para NOVO QR CODE (Desconectar)
app.post('/api/desconectar', async (req, res) => {
    try {
        if (isConnected) {
            await client.logout(); // Desconecta o WhatsApp atual
        }
        isConnected = false;
        qrCodeData = '';
        // Reinicializa o cliente para gerar novo QR
        await client.initialize();
        res.json({ sucesso: true, mensagem: 'Gerando novo QR Code...' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao desconectar ou reiniciar.' });
    }
});

// Rota para o painel ler as mensagens recebidas
app.get('/api/mensagens', (req, res) => {
    res.json(mensagensRecebidas);
});

// Rota para testar o envio de mensagem
app.post('/api/enviar', async (req, res) => {
    const { numero, mensagem } = req.body;
    if (!isConnected) return res.status(400).json({ erro: 'WhatsApp não conectado.' });

    try {
        const numeroFormatado = `${numero}@c.us`;
        await client.sendMessage(numeroFormatado, mensagem);
        res.json({ sucesso: true, mensagem: 'Mensagem enviada com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Falha ao enviar', detalhe: erro.message });
    }
});

const PORT = 3001; // Mantendo 3001 por segurança local
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
