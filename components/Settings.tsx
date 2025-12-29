
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
      alert('MODO PWA:\nPara transformar em App agora:\n1. Use o Chrome no Android.\n2. Clique nos 3 pontos verticais.\n3. "Instalar Aplicativo".\n\nPara gerar o APK oficial, use o PWABuilder.com');
    }
  }

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
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Seção PWABuilder */}
      <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-20 rotate-12">
           <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.3414L19.4621 18.6946C19.6893 19.0883 19.5544 19.5898 19.1606 19.8169C18.7668 20.0441 18.2653 19.9092 18.0381 19.5154L16.0827 16.1332C14.8697 16.6961 13.5042 17.0142 12.062 17.0142C10.6198 17.0142 9.25433 16.6961 8.04135 16.1332L6.0859 19.5154C5.85873 19.9092 5.35722 20.0441 4.96344 19.8169C4.56965 19.5898 4.43477 19.0883 4.66195 18.6946L6.60101 15.3414C4.42875 13.916 3 11.4116 3 8.54419V8H21V8.54419C21 11.4116 19.5713 13.916 17.523 15.3414ZM7 11.5C7.55228 11.5 8 11.0523 8 10.5C8 9.94772 7.55228 9.5 7 9.5C6.44772 9.5 6 9.94772 6 10.5C6 11.0523 6.44772 11.5 7 11.5ZM17 11.5C17.5523 11.5 18 11.0523 18 10.5C18 9.94772 17.5523 9.5 17 9.5C16.4477 9.5 16 9.94772 16 10.5C16 11.0523 16.4477 11.5 17 11.5Z"/></svg>
        </div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2">Gerar APK Profissional</h3>
        <p className="text-[10px] text-blue-100 font-medium leading-relaxed mb-5">
          O projeto está pronto para o <span className="text-white font-bold">PWABuilder.com</span>. Basta colocar o link deste site lá e baixar o APK assinado para Android.
        </p>
        <button
          onClick={handleInstallClick}
          className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
        >
          {deferredPrompt ? 'Instalar no Android' : 'Ver Guia de Instalação'}
        </button>
      </div>

      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
        <h3 className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-4">Personalizar Mensagens</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-blue-500 uppercase mb-2 ml-2">Vencimento Próximo</label>
            <textarea
              value={tempSettings.messageTemplateUpcoming}
              onChange={(e) => setTempSettings({ ...tempSettings, messageTemplateUpcoming: e.target.value })}
              className="w-full bg-gray-50 border-0 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none min-h-[120px] transition-all"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-red-500 uppercase mb-2 ml-2">Vencimento Expirado</label>
            <textarea
              value={tempSettings.messageTemplateExpired}
              onChange={(e) => setTempSettings({ ...tempSettings, messageTemplateExpired: e.target.value })}
              className="w-full bg-gray-50 border-0 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none min-h-[120px] transition-all"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest transition-all ${savedFeedback ? 'bg-green-500 text-white shadow-green-100' : 'bg-gray-900 text-white shadow-gray-200'} shadow-xl active:scale-95`}
      >
        {savedFeedback ? '✓ Configurações Salvas' : 'Salvar Preferências'}
      </button>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={handleExportCSV} className="bg-white border border-gray-100 text-gray-500 font-black py-5 rounded-[1.5rem] text-[9px] uppercase tracking-widest flex flex-col items-center gap-2 active:bg-gray-50 transition-colors">
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Exportar CSV
        </button>
        <button onClick={handleImportClick} className="bg-white border border-gray-100 text-gray-500 font-black py-5 rounded-[1.5rem] text-[9px] uppercase tracking-widest flex flex-col items-center gap-2 active:bg-gray-50 transition-colors">
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
          Importar CSV
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
      </div>
    </div>
  );
};

export default Settings;
