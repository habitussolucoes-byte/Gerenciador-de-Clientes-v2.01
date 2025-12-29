
import React, { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave(tempSettings);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleExportCSV = () => {
    // Cabeçalhos do CSV
    const headers = ['ID', 'Nome', 'Usuario', 'WhatsApp', 'Valor', 'Meses', 'Inicio', 'Vencimento', 'TotalPago', 'Ativo'];
    
    // Mapear dados para linhas
    const rows = clients.map(c => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`, // Escapar aspas para CSV
      `"${(c.user || '').replace(/"/g, '""')}"`,
      c.whatsapp,
      c.value.toString(),
      c.durationMonths.toString(),
      c.startDate,
      c.expirationDate,
      (c.totalPaidValue || 0).toString(),
      c.isActive !== false ? 'SIM' : 'NAO'
    ]);

    // Montar string do CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Adicionar BOM para Excel reconhecer UTF-8
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_tv_backup_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) throw new Error('Arquivo vazio ou inválido');

        const headers = lines[0].replace('\ufeff', '').split(',');
        const importedClients: Client[] = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          // Regex simples para lidar com campos entre aspas que contém vírgulas
          const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (!values || values.length < headers.length) continue;

          // Remover aspas extras
          const clean = (val: string) => val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1).replace(/""/g, '"') : val;

          const rowData: any = {};
          headers.forEach((header, idx) => {
            rowData[header.trim()] = clean(values[idx]);
          });

          const value = parseFloat(rowData.Valor) || 0;
          const totalPaid = parseFloat(rowData.TotalPago) || value;

          importedClients.push({
            id: rowData.ID || Date.now().toString() + i,
            name: rowData.Nome || 'Sem Nome',
            user: rowData.Usuario || '',
            whatsapp: rowData.WhatsApp || '',
            value: value,
            durationMonths: parseInt(rowData.Meses) || 1,
            startDate: rowData.Inicio || new Date().toISOString().split('T')[0],
            expirationDate: rowData.Vencimento || new Date().toISOString().split('T')[0],
            totalPaidValue: totalPaid,
            isActive: rowData.Ativo === 'SIM',
            // Recriar um histórico básico para não perder a informação financeira no gráfico
            renewalHistory: [{
              id: 'initial-' + Date.now() + i,
              startDate: rowData.Inicio || '',
              endDate: rowData.Vencimento || '',
              durationMonths: parseInt(rowData.Meses) || 1,
              value: totalPaid,
              createdAt: new Date().toISOString()
            }]
          });
        }

        if (importedClients.length > 0) {
          if (window.confirm(`Detectamos ${importedClients.length} clientes. Deseja substituir os dados atuais pelos deste CSV?`)) {
            onImport(importedClients);
            alert('Dados importados com sucesso via CSV!');
          }
        } else {
          alert('Não foi possível encontrar clientes válidos no CSV.');
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao processar CSV. Verifique se o formato está correto.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const placeholders = [
    { tag: '{{nome}}', desc: 'Nome do cliente' },
    { tag: '{{usuario}}', desc: 'Usuário/Login' },
    { tag: '{{vencimento}}', desc: 'Data de vencimento' },
    { tag: '{{valor}}', desc: 'Valor da renovação' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
        <h3 className="text-blue-800 font-black text-xs uppercase tracking-widest mb-2">Variáveis Disponíveis</h3>
        <p className="text-[10px] text-blue-600 mb-3 font-medium">Use estas tags no texto para que o app preencha automaticamente:</p>
        <div className="grid grid-cols-2 gap-2">
          {placeholders.map(p => (
            <div key={p.tag} className="bg-white p-2 rounded-lg shadow-sm border border-blue-100">
              <code className="text-blue-700 font-bold text-xs">{p.tag}</code>
              <p className="text-[9px] text-gray-400 font-bold uppercase">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Mensagem: Próximo ao Vencimento</label>
          <textarea
            value={tempSettings.messageTemplateUpcoming}
            onChange={(e) => setTempSettings({ ...tempSettings, messageTemplateUpcoming: e.target.value })}
            className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-medium text-sm shadow-sm focus:ring-4 focus:ring-blue-100 outline-none min-h-[120px] transition-all"
            placeholder="Escreva a mensagem aqui..."
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Mensagem: Já Vencido</label>
          <textarea
            value={tempSettings.messageTemplateExpired}
            onChange={(e) => setTempSettings({ ...tempSettings, messageTemplateExpired: e.target.value })}
            className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-medium text-sm shadow-sm focus:ring-4 focus:ring-blue-100 outline-none min-h-[120px] transition-all"
            placeholder="Escreva a mensagem aqui..."
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${savedFeedback ? 'bg-green-500 text-white' : 'bg-blue-600 text-white active:scale-95'}`}
      >
        {savedFeedback ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Configurações Salvas!
          </>
        ) : 'Salvar Templates'}
      </button>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-gray-800 font-black text-sm uppercase tracking-widest mb-4">Planilha e Backup</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-gray-200 text-gray-600 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </button>
          
          <button
            onClick={handleImportClick}
            className="bg-white border border-gray-200 text-gray-600 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Importar CSV
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />
        <p className="text-[9px] text-gray-400 mt-3 font-bold uppercase text-center italic leading-relaxed">
          O CSV pode ser aberto no Excel.<br/>Use a exportação para garantir o formato correto.
        </p>
      </div>
    </div>
  );
};

export default Settings;
