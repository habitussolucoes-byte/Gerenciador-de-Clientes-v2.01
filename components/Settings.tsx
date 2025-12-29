
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, Client } from '../types';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  clients: Client[];
  onImport: (clients: Client[]) => void;
}

const Settings: React.FC<Props> = ({ settings, onSave, clients, onImport }) => {
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert('Para instalar:\n1. Clique nos 3 pontos do Chrome (acima à direita)\n2. Selecione "Instalar Aplicativo" ou "Adicionar à Tela de Início".');
    }
  };

  const handleSave = () => {
    onSave(tempSettings);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nome', 'Usuario', 'WhatsApp', 'Valor', 'Meses', 'Inicio', 'Vencimento', 'TotalPago', 'Ativo'];
    const rows = clients.map(c => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${(c.user || '').replace(/"/g, '""')}"`,
      c.whatsapp,
      c.value.toString(),
      c.durationMonths.toString(),
      c.startDate,
      c.expirationDate,
      (c.totalPaidValue || 0).toString(),
      c.isActive !== false ? 'SIM' : 'NAO'
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_tv_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) throw new Error('Vazio');
        const headers = lines[0].replace('\ufeff', '').split(',');
        const importedClients: Client[] = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (!values) continue;
          const clean = (val: string) => val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1).replace(/""/g, '"') : val;
          const rowData: any = {};
          headers.forEach((header, idx) => { rowData[header.trim()] = clean(values[idx]); });
          const val = parseFloat(rowData.Valor) || 0;
          importedClients.push({
            id: rowData.ID || Date.now().toString() + i,
            name: rowData.Nome || 'Sem Nome',
            user: rowData.Usuario || '',
            whatsapp: rowData.WhatsApp || '',
            value: val,
            durationMonths: parseInt(rowData.Meses) || 1,
            startDate: rowData.Inicio || '',
            expirationDate: rowData.Vencimento || '',
            totalPaidValue: parseFloat(rowData.TotalPago) || val,
            isActive: rowData.Ativo === 'SIM',
            renewalHistory: [{
              id: 'imp-' + Date.now() + i,
              startDate: rowData.Inicio || '',
              endDate: rowData.Vencimento || '',
              durationMonths: parseInt(rowData.Meses) || 1,
              value: val,
              createdAt: new Date().toISOString()
            }]
          });
        }
        if (importedClients.length > 0 && window.confirm(`Importar ${importedClients.length} clientes?`)) {
          onImport(importedClients);
        }
      } catch (err) { alert('Erro no CSV'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Seção Instalação - Crucial para Android */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-[2rem] text-white shadow-lg shadow-blue-100">
        <h3 className="text-xs font-black uppercase tracking-widest mb-1 opacity-90">App Nativo Android</h3>
        <p className="text-[10px] mb-4 font-medium opacity-80 leading-relaxed">
          Instale como um aplicativo para remover a barra do navegador e usar em tela cheia.
        </p>
        <button
          onClick={handleInstallClick}
          className="w-full bg-white text-blue-700 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {deferredPrompt ? 'Instalar Agora' : 'Como Instalar'}
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
        <h3 className="text-blue-800 font-black text-xs uppercase tracking-widest mb-3">Tags Inteligentes</h3>
        <div className="grid grid-cols-2 gap-2">
          {['{{nome}}', '{{usuario}}', '{{vencimento}}', '{{valor}}'].map(tag => (
            <div key={tag} className="bg-white p-2 rounded-xl shadow-sm border border-blue-50 text-center">
              <code className="text-blue-600 font-bold text-[11px]">{tag}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Texto: Cobrança</label>
          <textarea
            value={tempSettings.messageTemplateUpcoming}
            onChange={(e) => setTempSettings({ ...tempSettings, messageTemplateUpcoming: e.target.value })}
            className="w-full bg-white border border-gray-100 rounded-[1.5rem] p-4 text-sm font-medium shadow-sm focus:ring-4 focus:ring-blue-50 outline-none min-h-[120px]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Texto: Vencido</label>
          <textarea
            value={tempSettings.messageTemplateExpired}
            onChange={(e) => setTempSettings({ ...tempSettings, messageTemplateExpired: e.target.value })}
            className="w-full bg-white border border-gray-100 rounded-[1.5rem] p-4 text-sm font-medium shadow-sm focus:ring-4 focus:ring-blue-50 outline-none min-h-[120px]"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest transition-all ${savedFeedback ? 'bg-green-500 text-white shadow-green-100' : 'bg-blue-600 text-white shadow-blue-100'} shadow-xl active:scale-95`}
      >
        {savedFeedback ? '✓ Salvo!' : 'Salvar Alterações'}
      </button>

      <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-3">
        <button onClick={handleExportCSV} className="bg-white border border-gray-200 text-gray-600 font-black py-4 rounded-2xl text-[9px] uppercase tracking-widest flex flex-col items-center gap-2 active:bg-gray-50 transition-colors">
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Exportar
        </button>
        <button onClick={handleImportClick} className="bg-white border border-gray-200 text-gray-600 font-black py-4 rounded-2xl text-[9px] uppercase tracking-widest flex flex-col items-center gap-2 active:bg-gray-50 transition-colors">
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
          Importar
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
      </div>
    </div>
  );
};

export default Settings;
