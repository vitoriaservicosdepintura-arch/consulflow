import React from 'react';
import { FileText, Sheet, FileSearch, ArrowRight } from 'lucide-react';

interface EditorsHubProps {
    onSelect: (tab: any) => void;
}

const EditorsHub: React.FC<EditorsHubProps> = ({ onSelect }) => {
    const editors = [
        {
            id: 'editor',
            title: 'Editor de Texto',
            description: 'Crie e edite documentos profissionais com formatação avançada.',
            icon: FileText,
            color: 'bg-blue-500',
            lightColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            id: 'spreadsheet',
            title: 'Planilha Inteligente',
            description: 'Gerencie dados, cálculos e tabelas de forma organizada e rápida.',
            icon: Sheet,
            color: 'bg-emerald-500',
            lightColor: 'bg-emerald-50',
            textColor: 'text-emerald-600',
        },
        {
            id: 'pdf-editor',
            title: 'Editor de PDF',
            description: 'Visualize, anote e modifique arquivos PDF com facilidade.',
            icon: FileSearch,
            color: 'bg-orange-500',
            lightColor: 'bg-orange-50',
            textColor: 'text-orange-600',
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <FileText className="w-64 h-64 -mr-16 -mt-16" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-4xl font-black mb-4 leading-tight">Central de Editores</h2>
                    <p className="text-indigo-100 text-lg opacity-90">
                        Acesse todas as ferramentas de criação e edição em um único lugar.
                        Produtividade máxima para seus documentos e planilhas.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {editors.map((editor) => (
                    <button
                        key={editor.id}
                        onClick={() => onSelect(editor.id)}
                        className="group relative bg-card p-8 rounded-[2rem] border border-border hover:border-indigo-500/50 hover:shadow-2xl transition-all duration-500 text-left flex flex-col h-full"
                    >
                        <div className={`w-16 h-16 ${editor.lightColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                            <editor.icon className={`w-8 h-8 ${editor.textColor}`} />
                        </div>

                        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-indigo-600 transition-colors">
                            {editor.title}
                        </h3>

                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                            {editor.description}
                        </p>

                        <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 group-hover:gap-4 transition-all">
                            Acessar Editor <ArrowRight className="w-4 h-4" />
                        </div>

                        <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-border group-hover:bg-indigo-500 transition-colors" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EditorsHub;
