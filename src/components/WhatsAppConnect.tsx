import React, { useState, useEffect } from 'react';
import { io } from "socket.io-client";
import { Zap, MessageCircle, RefreshCw } from "lucide-react";

const WhatsAppConnect = () => {
    const [status, setStatus] = useState('iniciando');
    const [qrCode, setQrCode] = useState('');
    const [apiUrl, setApiUrl] = useState('http://localhost:3001');

    useEffect(() => {
        const socket = io(apiUrl);

        socket.on('connect', () => {
            console.log('✅ Socket conectado no Connect UI');
        });

        socket.on('status_update', (data) => {
            setStatus(data.status);
            if (data.qr_code_imagem) {
                setQrCode(data.qr_code_imagem);
            }
        });

        // Fallback polling (10s)
        const checkStatus = async () => {
            try {
                const res = await fetch(`${apiUrl}/api/status`);
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data.status);
                    if (data.qr_code_imagem) setQrCode(data.qr_code_imagem);
                }
            } catch (err) {
                console.error("Erro ao conectar API:", err);
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 3000);

        return () => {
            socket.disconnect();
            clearInterval(interval);
        };
    }, [apiUrl]);

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-card rounded-[2rem] border border-border shadow-2xl text-center max-w-sm mx-auto">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <Zap className={`w-8 h-8 ${status === 'conectado' ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`} />
            </div>

            <h2 className="text-2xl font-black mb-2 text-slate-800">Conexão WhatsApp</h2>
            <p className="text-xs text-slate-400 mb-8 px-4">Sincronize o seu atendimento com a Inteligência Artificial da SVG Multimídia.</p>

            {status === 'iniciando' && (
                <div className="space-y-6 py-4">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-emerald-500 animate-reverse-spin" />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-600 font-bold animate-pulse">Iniciando o WhatsApp...</p>
                        <p className="text-[10px] text-slate-400 mt-2">Isto pode demorar até 30 segundos dependendo da sua conexão.</p>
                    </div>
                </div>
            )}

            {status === 'aguardando_qr' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
                    <div className="p-4 bg-white rounded-3xl shadow-2xl inline-block border-4 border-emerald-500/10 relative group">
                        {qrCode ? (
                            <img src={qrCode} alt="QR Code" className="w-[180px] h-[180px] rounded-xl" />
                        ) : (
                            <div className="w-[180px] h-[180px] bg-slate-50 flex items-center justify-center rounded-xl">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
                            </div>
                        )}
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-card">
                            <Scan className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-emerald-700 text-xs font-bold flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            Escaneie para conectar a IA
                        </p>
                    </div>
                </div>
            )}

            {status === 'conectado' && (
                <div className="animate-in slide-in-from-top-4 duration-700">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-500/20 shadow-lg">
                        <span className="text-emerald-500 text-4xl">✅</span>
                    </div>
                    <p className="text-emerald-600 font-black text-xl mb-2">IA Sincronizada!</p>
                    <p className="text-xs text-slate-500 mb-8 italic">O seu CRM já está capturando mensagens em tempo real.</p>

                    <button
                        onClick={async () => {
                            const res = await fetch(`${apiUrl}/api/desconectar`, { method: 'POST' });
                            if (res.ok) window.location.reload();
                        }}
                        className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
                    >
                        Desconectar da IA
                    </button>
                </div>
            )}
        </div>
    );
};

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
const Scan = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="7" x2="17" y1="12" y2="12" /></svg>
);

export default WhatsAppConnect;
