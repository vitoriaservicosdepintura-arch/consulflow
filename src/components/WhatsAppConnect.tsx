import React, { useState, useEffect } from 'react';

const WhatsAppConnect = () => {
    const [status, setStatus] = useState('iniciando');
    const [qrCode, setQrCode] = useState('');

    useEffect(() => {
        // Função para buscar os dados da API
        // Usando porta 3001 para coincidir com a API ativa
        const fetchStatus = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/status');
                const data = await response.json();

                setStatus(data.status);

                if (data.status === 'aguardando_qr') {
                    setQrCode(data.qr_code_imagem);
                }
            } catch (error) {
                console.error('Erro ao buscar status:', error);
            }
        };

        // Chama imediatamente e depois a cada 3 segundos
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);

        // Limpa o intervalo quando o componente for desmontado
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-card rounded-3xl border border-border shadow-sm text-center">
            <h2 className="text-xl font-bold mb-4">Conexão WhatsApp</h2>

            {status === 'iniciando' && (
                <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground animate-pulse">Iniciando o WhatsApp, aguarde...</p>
                </div>
            )}

            {status === 'aguardando_qr' && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-4 bg-white rounded-2xl shadow-lg inline-block border border-border">
                        <img src={qrCode} alt="QR Code" className="w-[200px] h-[200px]" />
                    </div>
                    <p className="text-orange-500 font-bold flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                        Escaneie o QR Code com seu celular
                    </p>
                </div>
            )}

            {status === 'conectado' && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-emerald-500 text-3xl">✅</span>
                    </div>
                    <p className="text-emerald-600 font-bold text-lg">WhatsApp Conectado com Sucesso!</p>
                    <p className="text-xs text-muted-foreground mt-2 italic">A monitorar mensagens em tempo real...</p>

                    <button
                        onClick={async () => {
                            const res = await fetch('http://localhost:3001/api/desconectar', { method: 'POST' });
                            if (res.ok) window.location.reload();
                        }}
                        className="mt-6 px-4 py-2 border border-border rounded-xl text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        Desconectar / Novo QR
                    </button>
                </div>
            )}
        </div>
    );
};

export default WhatsAppConnect;
