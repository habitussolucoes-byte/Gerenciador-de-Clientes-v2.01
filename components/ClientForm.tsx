
import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { calculateExpiration, formatCurrency } from '../utils/dateUtils';

interface Props {
  onSubmit: (client: Client & { registrationDate?: string }) => void;
  onCancel: () => void;
  initialData?: Client;
}

const ClientForm: React.FC<Props> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    user: initialData?.user || '',
    whatsapp: initialData?.whatsapp || '',
    value: initialData?.value?.toString() || '',
    durationMonths: initialData?.durationMonths?.toString() || '1',
    startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
    registrationDate: new Date().toISOString().split('T')[0] // Data do pagamento efetivo
  });

  const [expiration, setExpiration] = useState('');

  useEffect(() => {
    if (formData.startDate && formData.durationMonths) {
      const exp = calculateExpiration(formData.startDate, parseInt(formData.durationMonths) || 0);
      setExpiration(exp);
    }
  }, [formData.startDate, formData.durationMonths]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.whatsapp || !formData.value) return;

    const val = parseFloat(formData.value);
    
    const client: Client & { registrationDate?: string } = {
      id: initialData?.id || Date.now().toString(),
      name: formData.name,
      user: formData.user,
      whatsapp: formData.whatsapp,
      value: val,
      durationMonths: parseInt(formData.durationMonths),
      startDate: formData.startDate,
      expirationDate: expiration,
      totalPaidValue: initialData ? initialData.totalPaidValue : val,
      lastMessageDate: initialData?.lastMessageDate,
      renewalHistory: initialData?.renewalHistory || [],
      isActive: initialData ? initialData.isActive : true,
      registrationDate: formData.registrationDate // Passamos para o App tratar no histórico
    };

    onSubmit(client);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Cliente</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-gray-50 border-0 rounded-2xl p-4 font-semibold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Ex: João Silva"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Usuário (Login)</label>
          <input
            type="text"
            value={formData.user}
            onChange={(e) => setFormData({ ...formData, user: e.target.value })}
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Opcional"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp</label>
          <input
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="DDD + Número"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 font-bold text-lg text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="0,00"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Plano (Meses)</label>
          <select
            value={formData.durationMonths}
            onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {[1, 2, 3, 6, 12].map(m => (
              <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-orange-400 uppercase mb-1">Data do Pagamento</label>
          <input
            type="date"
            value={formData.registrationDate}
            onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
            className="w-full bg-orange-50 border border-orange-100 rounded-2xl p-3 font-semibold text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            required
          />
          <p className="text-[8px] text-orange-400 mt-1 font-bold uppercase">Define o ganho diário</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-blue-400 uppercase mb-1">Data de Início</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-3 font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <p className="text-[8px] text-blue-400 mt-1 font-bold uppercase">Define o vencimento</p>
        </div>
      </div>

      {!initialData && (
        <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-green-600 uppercase">Recebimento Inicial</p>
            <p className="text-xl font-extrabold text-green-800">{formatCurrency(parseFloat(formData.value) || 0)}</p>
          </div>
          <div className="text-right">
             <p className="text-[9px] text-green-600 uppercase font-black">Expira em:</p>
             <p className="text-sm font-black text-green-700">{calculateExpiration(formData.startDate, parseInt(formData.durationMonths) || 1).split('-').reverse().join('/')}</p>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl shadow-sm active:scale-95 transition-transform"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

export default ClientForm;
