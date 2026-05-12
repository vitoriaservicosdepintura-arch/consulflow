
import React, { useState, useEffect } from 'react';
import {
    Wand2, Layout, Speaker, Image as ImageIcon, BarChart3, Palette,
    Settings, Bolt, Plus, Download, Bookmark, Share2, Clock,
    Type, CloudUpload, Sparkles, LayoutKanban, World,
    Check, Facebook, Instagram, Linkedin, Globe, Phone, Mail, UserPlus2, RefreshCw, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';

const MarketingStudio = () => {
    const [currentView, setCurrentView] = useState<'studio' | 'carousel' | 'ads' | 'gallery' | 'analytics' | 'brand'>('studio');
    const [currentFormat, setCurrentFormat] = useState('1/1');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [activeStyles, setActiveStyles] = useState<string[]>(['Fotográfico']);
    const [modalOpen, setModalOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [slideCount, setSlideCount] = useState(4);
    const [activeSlides, setActiveSlides] = useState<number[]>([]);
    const [slideTitle, setSlideTitle] = useState('5 Estratégias para Escalar seu Negócio');
    const [adHeadline, setAdHeadline] = useState('Aumente seu faturamento em 300%');
    const [adBody, setAdBody] = useState('Estratégias exclusivas para consultores que querem escalar seus negócios.');
    const [adCta, setAdCta] = useState('Quero Saber Como →');
    const [activePlatform, setActivePlatform] = useState('meta');

    const togglePill = (style: string) => {
        setActiveStyles(prev =>
            prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
        );
    };

    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            toast.error('Escreva um prompt antes de gerar!');
            return;
        }

        setIsLoading(true);
        setGeneratedImageUrl(null);

        const stylesStr = activeStyles.join(', ');
        const enhancedPrompt = `${prompt}. Visual style: ${stylesStr || 'professional photographic'}. Ultra high quality, premium marketing image, professional composition, cinematic lighting.`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://consuflow.app',
                    'X-Title': 'ConsuFlow AI Marketing Studio'
                },
                body: JSON.stringify({
                    model: 'openai/dall-e-3',
                    messages: [{ role: 'user', content: enhancedPrompt }],
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            if (data.data && data.data[0] && data.data[0].url) {
                setGeneratedImageUrl(data.data[0].url);
                toast.success('Arte gerada com sucesso! ✨');
            } else {
                throw new Error('No image');
            }
        } catch (e) {
            toast.info('Arte gerada! (Demonstração visual)');
            // Mock fallback
            setGeneratedImageUrl('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1080');
        } finally {
            setIsLoading(false);
        }
    };

    const openSuggestionsModal = async () => {
        setModalOpen(true);
        setLoadingSuggestions(true);
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://consuflow.app',
                    'X-Title': 'ConsuFlow AI Marketing Studio'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: `Gere 6 prompts criativos e profissionais para criar imagens de marketing premium para um consultor. Responda APENAS com JSON válido, sem markdown: {"prompts":["prompt1","prompt2","prompt3","prompt4","prompt5","prompt6"]}. Escreva em português do Brasil.`
                    }],
                    max_tokens: 500
                })
            });

            const data = await res.json();
            const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(text);
            setSuggestions(parsed.prompts);
        } catch (e) {
            setSuggestions([
                'Consultor de negócios em escritório executivo moderno, iluminação lateral suave dourada',
                'Reunião de alto nível em sala de conferência minimalista, paleta escura e dourada',
                'Cena abstrata de crescimento e sucesso: gráficos ascendentes em holograma',
                'Retrato profissional estilo magazine de um consultor confiante',
                'Ambiente de trabalho premium: notebook, cafezinho, luz natural e paleta neutra',
                'Infográfico visual moderno com dados de crescimento empresarial'
            ]);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    return (
        <div className="flex flex-col min-h-[800px] bg-[#0D0D0D] text-[#F5F0E8] rounded-[2rem] overflow-hidden border border-emerald-500/10 shadow-2xl font-['DM_Sans',sans-serif]">
            {/* Inner Header/Nav based on provided HTML */}
            <div className="flex border-b border-white/5 bg-[#161616]/50 backdrop-blur-md">
                <div className="flex items-center gap-6 p-4 px-8 border-r border-white/5">
                    <div className="flex flex-col">
                        <span className="font-['Playfair_Display',serif] text-xl text-[#C9A84C] font-bold">ConsuFlow</span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-[#7A7060]">AI Marketing Studio</span>
                    </div>
                </div>
                <div className="flex-1 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setCurrentView('studio')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'studio' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-[#B8B0A0] hover:bg-white/5'}`}
                    >
                        <Wand2 className="w-4 h-4" /> Estúdio IA
                    </button>
                    <button
                        onClick={() => setCurrentView('carousel')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'carousel' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-[#B8B0A0] hover:bg-white/5'}`}
                    >
                        <Layout className="w-4 h-4" /> Carrossel
                    </button>
                    <button
                        onClick={() => setCurrentView('ads')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'ads' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-[#B8B0A0] hover:bg-white/5'}`}
                    >
                        <Speaker className="w-4 h-4" /> Anúncios
                    </button>
                    <button
                        onClick={() => setCurrentView('gallery')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'gallery' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-[#B8B0A0] hover:bg-white/5'}`}
                    >
                        <ImageIcon className="w-4 h-4" /> Galeria
                    </button>
                    <button
                        onClick={() => setCurrentView('analytics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'analytics' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-[#B8B0A0] hover:bg-white/5'}`}
                    >
                        <BarChart3 className="w-4 h-4" /> Analytics
                    </button>
                    <button
                        onClick={() => setCurrentView('brand')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'brand' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-[#B8B0A0] hover:bg-white/5'}`}
                    >
                        <Palette className="w-4 h-4" /> Branding
                    </button>
                </div>
                <div className="flex items-center gap-3 px-6 border-l border-white/5">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                        <Bolt className="w-3.5 h-3.5 text-[#C9A84C]" />
                        <span className="text-[10px] font-bold text-[#C9A84C]">47 CRÉDITOS</span>
                    </div>
                </div>
            </div>

            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                {currentView === 'studio' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-['Playfair_Display',serif] text-white">Estúdio de Criação <span className="text-[#C9A84C]">IA</span></h1>
                                <p className="text-[#7A7060] text-sm mt-1">Gere imagens, posts e artes profissionais com inteligência artificial</p>
                            </div>
                            <button
                                onClick={openSuggestionsModal}
                                className="flex items-center gap-2 px-4 py-2 border border-[#C9A84C]/30 text-[#C9A84C] rounded-xl text-xs font-bold hover:bg-[#C9A84C]/5 transition-all"
                            >
                                <Lightbulb className="w-4 h-4" /> Sugerir Prompt com IA
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Canvas Area */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="bg-[#161616] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                                    <div className="flex items-center justify-between p-4 px-6 border-b border-white/5">
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#B8B0A0]">
                                            <ImageIcon className="w-4 h-4 text-[#C9A84C]" /> Canvas de Criação
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-white/5 rounded-lg transition-all text-[#B8B0A0]"><Download className="w-4 h-4" /></button>
                                            <button className="p-2 hover:bg-white/5 rounded-lg transition-all text-[#B8B0A0]"><Bookmark className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex gap-2 mb-6">
                                            {['1/1', '9/16', '16/9', '4/5'].map(ratio => (
                                                <button
                                                    key={ratio}
                                                    onClick={() => setCurrentFormat(ratio)}
                                                    className={`flex-1 py-3 rounded-xl border text-[10px] font-bold transition-all ${currentFormat === ratio ? 'bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]' : 'border-white/5 text-[#7A7060] hover:border-white/10'}`}
                                                >
                                                    {ratio === '1/1' ? 'FEED (1:1)' : ratio === '9/16' ? 'STORY (9:16)' : ratio === '16/9' ? 'BANNER (16:9)' : 'PORTRAIT (4:5)'}
                                                </button>
                                            ))}
                                        </div>

                                        <div
                                            className="bg-[#1E1E1E] rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-500 shadow-inner group"
                                            style={{ aspectRatio: currentFormat }}
                                        >
                                            {!isLoading && !generatedImageUrl && (
                                                <div className="text-center p-8">
                                                    <Wand2 className="w-16 h-16 text-[#7A7060]/20 mx-auto mb-4" />
                                                    <p className="text-[#7A7060] text-sm leading-relaxed">Configure as opções ao lado e clique em<br /><span className="text-[#C9A84C] font-bold">Gerar Arte com IA</span> para criar sua imagem</p>
                                                </div>
                                            )}
                                            {isLoading && (
                                                <div className="text-center space-y-4">
                                                    <div className="w-12 h-12 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(201,168,76,0.3)]" />
                                                    <p className="text-[11px] font-bold tracking-[0.2em] text-[#C9A84C] animate-pulse">GERANDO ARTE...</p>
                                                </div>
                                            )}
                                            {generatedImageUrl && !isLoading && (
                                                <img src={generatedImageUrl} className="w-full h-full object-cover animate-in zoom-in-95 duration-700" alt="Generated" />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mt-6">
                                            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 rounded-xl text-[11px] font-bold text-[#B8B0A0] hover:bg-white/10 transition-all">
                                                <RefreshCw className="w-3.5 h-3.5" /> REGENERAR
                                            </button>
                                            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 rounded-xl text-[11px] font-bold text-[#B8B0A0] hover:bg-white/10 transition-all">
                                                <Share2 className="w-3.5 h-3.5" /> COMPARTILHAR
                                            </button>
                                            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 rounded-xl text-[11px] font-bold text-[#B8B0A0] hover:bg-white/10 transition-all">
                                                <Clock className="w-3.5 h-3.5" /> AGENDAR
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Controls */}
                            <div className="space-y-6">
                                <div className="bg-[#161616] border border-white/5 rounded-3xl p-6 shadow-xl">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#B8B0A0] mb-4 flex items-center gap-2">
                                        <Type className="w-4 h-4 text-[#C9A84C]" /> Prompt & Configurações
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A7060]">Descreva sua arte</label>
                                            <textarea
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                className="w-full bg-[#1E1E1E] border border-white/5 rounded-2xl p-4 text-xs text-white outline-none focus:border-[#C9A84C]/30 transition-all min-h-[120px] resize-none custom-scrollbar"
                                                placeholder="Ex: Consultor de negócios moderno em escritório premium, estilo fotográfico, iluminação suave..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A7060]">Estilo Visual</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Fotográfico', 'Minimalista', 'Corporativo', 'Luxo Premium', 'Editorial'].map(style => (
                                                    <button
                                                        key={style}
                                                        onClick={() => togglePill(style)}
                                                        className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${activeStyles.includes(style) ? 'bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]' : 'border-white/5 text-[#7A7060] hover:border-white/10'}`}
                                                    >
                                                        {style}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A7060]">Tom da Mensagem</label>
                                            <select className="w-full bg-[#1E1E1E] border border-white/5 rounded-xl p-3 text-xs text-[#B8B0A0] outline-none appearance-none cursor-pointer">
                                                <option>Profissional & Confiante</option>
                                                <option>Moderno & Inovador</option>
                                                <option>Elegante & Premium</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#161616] border border-white/5 rounded-3xl p-6 shadow-xl">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#B8B0A0] mb-4 flex items-center gap-2">
                                        <CloudUpload className="w-4 h-4 text-[#C9A84C]" /> Referências
                                    </div>
                                    <div className="border border-dashed border-[#C9A84C]/20 bg-[#1E1E1E] rounded-2xl p-6 text-center cursor-pointer hover:bg-[#C9A84C]/5 transition-all group">
                                        <CloudUpload className="mx-auto w-8 h-8 text-[#7A7060] mb-2 group-hover:text-[#C9A84C]/50 transition-colors" />
                                        <p className="text-[11px] text-[#7A7060]">Arraste ou clique para carregar imagens</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateImage}
                                    disabled={isLoading}
                                    className="w-full bg-[#C9A84C] text-[#0D0D0D] py-4 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(201,168,76,0.3)] hover:bg-[#F2D98A] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-3"
                                >
                                    <Sparkles className="w-5 h-5" /> Gerar Arte com IA
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'carousel' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-['Playfair_Display',serif] text-white">Criador de <span className="text-[#C9A84C]">Carrossel</span></h1>
                                <p className="text-[#7A7060] text-sm mt-1">Monte carrosseis profissionais para Instagram e LinkedIn</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <div className="bg-[#161616] border border-white/5 rounded-3xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#B8B0A0] flex items-center gap-2">
                                            <LayoutKanban className="w-4 h-4 text-[#C9A84C]" /> Estrutura de Slides
                                        </div>
                                        <button className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-bold text-[#C9A84C] hover:bg-white/10 transition-all">+ Novo Slide</button>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                        {[1, 2, 3, 4].map(num => (
                                            <div key={num} className="flex-shrink-0 w-28 aspect-square bg-[#1E1E1E] border border-white/5 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer hover:border-[#C9A84C]/30 transition-all group">
                                                <span className="text-[10px] font-bold text-[#7A7060] mb-2">SLIDE {num}</span>
                                                <div className="w-10 h-1 mt-1 bg-white/5 rounded-full group-hover:bg-[#C9A84C]/30 transition-colors" />
                                                <div className="w-14 h-1 mt-1 bg-white/5 rounded-full group-hover:bg-[#C9A84C]/30 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 max-w-sm mx-auto aspect-square bg-[#1E1E1E] rounded-3xl border border-[#C9A84C]/10 flex items-center justify-center p-12 text-center shadow-2xl relative">
                                        <div className="absolute top-6 left-6 text-[10px] font-bold text-white/10 tracking-widest">SLIDE 01</div>
                                        <div>
                                            <h2 className="text-2xl font-['Playfair_Display',serif] text-[#C9A84C] mb-2">{slideTitle}</h2>
                                            <div className="w-12 h-1 bg-[#C9A84C] mx-auto mb-4" />
                                            <p className="text-[10px] text-[#7A7060] uppercase tracking-widest">Marketing Estratégico</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-[#161616] border border-white/5 rounded-3xl p-6 shadow-xl">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A7060] mb-2 block">Título do Slide</label>
                                    <input
                                        type="text"
                                        value={slideTitle}
                                        onChange={(e) => setSlideTitle(e.target.value)}
                                        className="w-full bg-[#1E1E1E] border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-[#C9A84C]/30 mb-4"
                                    />
                                    <button className="w-full bg-[#C9A84C]/10 text-[#C9A84C] py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#C9A84C]/20 transition-all border border-[#C9A84C]/20">
                                        Gerar Slide com IA
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'ads' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-['Playfair_Display',serif] text-white">Criador de <span className="text-[#C9A84C]">Anúncios</span></h1>
                                <p className="text-[#7A7060] text-sm mt-1">Anúncios comerciais premium para Meta, Google e LinkedIn</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mb-8">
                            {['meta', 'google', 'linkedin'].map(plt => (
                                <button
                                    key={plt}
                                    onClick={() => setActivePlatform(plt)}
                                    className={`p-6 rounded-3xl border transition-all text-center ${activePlatform === plt ? 'bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]' : 'bg-[#161616] border-white/5 text-[#7A7060] hover:border-white/10'}`}
                                >
                                    {plt === 'meta' ? <Facebook className="mx-auto mb-2" /> : plt === 'google' ? <Globe className="mx-auto mb-2" /> : <Linkedin className="mx-auto mb-2" />}
                                    <h3 className="text-xs font-bold uppercase tracking-widest">{plt === 'meta' ? 'Meta Ads' : plt === 'google' ? 'Google Ads' : 'LinkedIn Ads'}</h3>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 shadow-xl">
                                <div className="max-w-[320px] mx-auto bg-[#1E1E1E] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                                    <div className="p-4 flex items-center gap-3 border-b border-white/5">
                                        <div className="w-8 h-8 bg-[#C9A84C] rounded-full flex items-center justify-center text-[#0D0D0D] font-bold text-xs shadow-lg">JC</div>
                                        <div>
                                            <div className="text-[11px] font-bold text-white">João Consultor</div>
                                            <div className="text-[9px] text-[#7A7060] flex items-center gap-1">Patrocinado <World className="w-2 h-2" /></div>
                                        </div>
                                    </div>
                                    <div className="aspect-square bg-gradient-to-br from-[#1a1200] to-[#2d2000] p-10 flex flex-col items-center justify-center text-center">
                                        <h2 className="text-xl font-['Playfair_Display',serif] text-[#C9A84C] mb-4 leading-tight">{adHeadline}</h2>
                                        <p className="text-[10px] text-[#B8B0A0] leading-relaxed mb-6 italic">"{adBody}"</p>
                                        <div className="px-6 py-2 bg-[#C9A84C] text-[#0D0D0D] text-[10px] font-black rounded-lg shadow-lg uppercase tracking-widest">{adCta}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 shadow-xl">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A7060]">Headline do Anúncio</label>
                                            <input value={adHeadline} onChange={e => setAdHeadline(e.target.value)} className="w-full bg-[#1E1E1E] border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-[#C9A84C]/30" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A7060]">Copy (Texto)</label>
                                            <textarea value={adBody} onChange={e => setAdBody(e.target.value)} className="w-full bg-[#1E1E1E] border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-[#C9A84C]/30 min-h-[80px] resize-none" />
                                        </div>
                                        <button className="w-full bg-[#C9A84C] text-[#0D0D0D] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-[#F2D98A] transition-all">Gerar Anúncio com IA</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'gallery' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-['Playfair_Display',serif] text-white">Minha <span className="text-[#C9A84C]">Galeria</span></h1>
                                <p className="text-[#7A7060] text-sm mt-1">Todo o conteúdo criado em um só lugar</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-square bg-[#161616] border border-white/5 rounded-3xl p-4 flex flex-col hover:border-[#C9A84C]/20 transition-all cursor-pointer group shadow-lg">
                                    <div className="flex-1 rounded-2xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center overflow-hidden">
                                        <ImageIcon className="w-10 h-10 text-[#7A7060]/20 group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-[11px] font-bold text-white uppercase tracking-widest">Arte #{i}</p>
                                        <p className="text-[9px] text-[#7A7060] mt-0.5 uppercase">CRIADO HÁ {i * 2} DIAS</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentView === 'analytics' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-['Playfair_Display',serif] text-white">Marketing <span className="text-[#C9A84C]">Analytics</span></h1>
                                <p className="text-[#7A7060] text-sm mt-1">Acompanhe a performance das suas campanhas</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 shadow-xl">
                                <p className="text-[10px] font-bold text-[#7A7060] uppercase tracking-widest mb-2">Impressões</p>
                                <p className="text-3xl font-['Playfair_Display',serif] text-white">12.4K</p>
                            </div>
                            <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 shadow-xl">
                                <p className="text-[10px] font-bold text-[#7A7060] uppercase tracking-widest mb-2">CTR Médio</p>
                                <p className="text-3xl font-['Playfair_Display',serif] text-emerald-500">2.1%</p>
                            </div>
                            <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 shadow-xl">
                                <p className="text-[10px] font-bold text-[#7A7060] uppercase tracking-widest mb-2">Leads Gerados</p>
                                <p className="text-3xl font-['Playfair_Display',serif] text-[#C9A84C]">142</p>
                            </div>
                            <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 shadow-xl">
                                <p className="text-[10px] font-bold text-[#7A7060] uppercase tracking-widest mb-2">ROI</p>
                                <p className="text-3xl font-['Playfair_Display',serif] text-sky-400">4.5x</p>
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'brand' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-['Playfair_Display',serif] text-white">Identidade <span className="text-[#C9A84C]">Visual</span></h1>
                                <p className="text-[#7A7060] text-sm mt-1">Configure sua marca para que a IA sempre gere conteúdo alinhado</p>
                            </div>
                            <button className="bg-[#C9A84C] text-[#0D0D0D] px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#F2D98A] transition-all">Salvar Brandbook</button>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 shadow-xl">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#B8B0A0] mb-6 flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-[#C9A84C]" /> Paleta Cromática
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    {['#C9A84C', '#161616', '#F2D98A', '#0D0D0D'].map(c => (
                                        <div key={c} className="space-y-2">
                                            <div className="aspect-square rounded-2xl border border-white/5 shadow-inner" style={{ background: c }} />
                                            <input defaultValue={c} className="w-full bg-transparent border-none text-[9px] text-center text-[#7A7060] outline-none font-bold" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 shadow-xl">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#B8B0A0] mb-6 flex items-center gap-2">
                                    <Type className="w-5 h-5 text-[#C9A84C]" /> Fontes & Voz
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-[#1E1E1E] rounded-2xl border border-white/5">
                                        <span className="text-xs font-bold text-[#B8B0A0]">FONTE PRIMÁRIA</span>
                                        <span className="text-xs font-['Playfair_Display',serif] text-[#C9A84C]">Playfair Display</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-[#1E1E1E] rounded-2xl border border-white/5">
                                        <span className="text-xs font-bold text-[#B8B0A0]">TOM DE VOZ</span>
                                        <span className="text-xs text-white">Premium & Autoritário</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal de Sugestões (Shadcn-like) */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
                    onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div className="relative bg-[#161616] border border-[#C9A84C]/20 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 text-[#7A7060] hover:text-[#C9A84C] cursor-pointer text-2xl font-light" onClick={() => setModalOpen(false)}>&times;</div>
                        <h2 className="text-2xl font-['Playfair_Display',serif] text-[#C9A84C] mb-2 font-bold flex items-center gap-3">
                            <Sparkles className="w-6 h-6 border-b-2 border-[#C9A84C]" /> Sugestões de Prompt IA
                        </h2>
                        <p className="text-[#7A7060] text-sm mb-6">Prompts exclusivos gerados pela IA para seu perfil.</p>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {loadingSuggestions ? (
                                <div className="text-center py-12">
                                    <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-[11px] font-bold text-[#7A7060] uppercase tracking-widest">Consultando Neurônios Criativos...</p>
                                </div>
                            ) : (
                                suggestions.map((s, i) => (
                                    <div
                                        key={i}
                                        onClick={() => { setPrompt(s); setModalOpen(false); toast.success('Prompt selecionado!'); }}
                                        className="p-4 bg-[#1E1E1E] border border-white/5 rounded-2xl text-[11px] text-[#B8B0A0] leading-relaxed cursor-pointer hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[10px] font-bold text-[#C9A84C] shrink-0">{i + 1}</div>
                                            <span>{s}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/5">
                            <button onClick={() => setModalOpen(false)} className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#7A7060] hover:text-white transition-all">CANCELAR</button>
                            <button onClick={() => setModalOpen(false)} className="px-6 py-2.5 bg-[#C9A84C]/10 text-[#C9A84C] rounded-xl text-xs font-bold hover:bg-[#C9A84C]/20 transition-all border border-[#C9A84C]/20">FECHAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Styles override for this component's scope */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};

export default MarketingStudio;
