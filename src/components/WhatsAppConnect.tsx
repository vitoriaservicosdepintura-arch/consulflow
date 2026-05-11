import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const WhatsAppConnect = () => {
    const [status, setStatus] = useState<'iniciando' | 'aguardando_qr' | 'conectado' | 'erro'>('iniciando');
    const [qrCode, setQrCode] = useState('');
    const [tentativas, setTentativas] = useState(0);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                // Sem cache — sempre busca dado novo
                cache: 'no-store',
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            console.log('[WhatsApp] Status:', data.status);

            if (data.status === 'conectado') {
                setStatus('conectado');
                setQrCode('');
            } else if (data.status === 'aguardando_qr' && data.qr_code_imagem) {
                setStatus('aguardando_qr');
                setQrCode(data.qr_code_imagem);
            } else {
                setStatus('iniciando');
            }

            setTentativas(0); // resetar contador de erros
        } catch (error) {
            console.error('[WhatsApp] Erro ao buscar status:', error);
            setTentativas(prev => prev + 1);
            if (tentativas >= 5) {
                setStatus('erro');
            }
        }
    }, [tentativas]);

    useEffect(() => {
        fetchStatus(); // busca imediata
        const interval = setInterval(fetchStatus, 3000); // polling a cada 3s
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleDesconectar = async () => {
        try {
            await fetch(`${API_URL}/api/desconectar`, { method: 'POST' });
            setStatus('iniciando');
            setQrCode('');
        } catch (e) {
            console.error('Erro ao desconectar:', e);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-card rounded-3xl border border-border shadow-sm text-center min-h-[280px]">
            <h2 className="text-xl font-bold mb-4">Conexão WhatsApp</h2>

            {/* INICIANDO */}
            {status === 'iniciando' && (
                <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground animate-pulse">Iniciando o WhatsApp, aguarde...</p>
                    <p className="text-xs text-muted-foreground">Conectando ao servidor local...</p>
                </div>
            )}

            {/* QR CODE */}
            {status === 'aguardando_qr' && qrCode && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-3 bg-white rounded-2xl shadow-lg inline-block border border-border">
                        <img
                            src={qrCode}
                            alt="QR Code WhatsApp"
                            className="w-[220px] h-[220px]"
                            onError={(e) => console.error('Erro ao carregar QR:', e)}
                        />
                    </div>
                    <p className="text-orange-500 font-bold flex items-center justify-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping inline-block" />
                        Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo
                    </p>
                    <button
                        onClick={fetchStatus}
                        className="text-xs text-muted-foreground underline"
                    >
                        Atualizar QR Code
                    </button>
                </div>
            )}

            {/* CONECTADO */}
            {status === 'conectado' && (
                <div className="animate-in slide-in-from-top-4 duration-500 space-y-3">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-emerald-500 text-3xl">✅</span>
                    </div>
                    <p className="text-emerald-600 font-bold text-lg">WhatsApp Conectado!</p>
                    <p className="text-xs text-muted-foreground italic">Monitorando mensagens em tempo real...</p>
                    <button
                        onClick={handleDesconectar}
                        className="mt-4 px-4 py-2 border border-border rounded-xl text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        Desconectar / Novo QR
                    </button>
                </div>
            )}

            {/* ERRO DE CONEXÃO */}
            {status === 'erro' && (
                <div className="space-y-3">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-red-500 text-3xl">❌</span>
                    </div>
                    <p className="text-red-500 font-bold">Servidor não encontrado</p>
                    <p className="text-xs text-muted-foreground">
                        Certifique-se que o servidor está rodando:<br />
                        <code className="bg-muted px-1 rounded text-xs">node server.js</code> na pasta <code className="bg-muted px-1 rounded text-xs">/server</code>
                    </p>
                    <button
                        onClick={() => { setStatus('iniciando'); setTentativas(0); fetchStatus(); }}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}
        </div>
    );
};

export default WhatsAppConnect;
