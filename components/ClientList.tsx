
import React, { useState } from 'react';
import { Client, AppSettings } from '../types';
import { formatDateBR, formatDateTimeBR, getStatus, formatCurrency, getDaysSince } from '../utils/dateUtils';

interface Props {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onRenew: (id: string) => void;
  onWhatsApp: (id: string) => void;
  onToggleActive: (id: string) => void;
  isSearching?: boolean;
  settings?: AppSettings;
}

const ClientList: React.FC<Props> = ({ clients, onEdit, onDelete, onRenew, onWhatsApp, onToggleActive, isSearching, settings }) => {
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  const [clickedWhatsappId, setClickedWhatsappId] = useState<string | null>(null);

  const sendWhatsApp = (client: Client) => {
    const status = getStatus(client);
    
    // Fallback templates if settings are missing
    const templateUpcoming = settings?.messageTemplateUpcoming || "Olá {{nome}}! Sua assinatura vence em {{vencimento}}.";
    const templateExpired = settings?.messageTemplateExpired || "Olá {{nome}}! Sua assinatura venceu em {{vencimento}}.";
    
    let messageText = (status === 'EXPIRED' || status === 'MESSAGE_SENT') 
      ? templateExpired 
      : templateUpcoming;

    // Tags replacement
    messageText = messageText
      .replace(/{{nome}}/g, client.name)
      .replace(/{{vencimento}}/g, formatDateBR(client.expirationDate))
      .replace(/{{valor}}/g, formatCurrency(client.value))
      .replace(/{{usuario}}/g, client.user || 'Não definido');

    const text = encodeURIComponent(messageText);
    const phone = client.whatsapp.replace(/\D/g, '');
    
    window.open(`https://wa.me/55${phone}?text=${text}`, '_blank');
    
    onWhatsApp(client.id);
    setClickedWhatsappId(client.id);
    setTimeout(() => setClickedWhatsappId(null), 2000);
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300 px-6">
        <p className="text-gray-400 font-medium">
          {isSearching ? 'Nenhum cliente encontrado.' : 'Nenhum vencimento iminente.'}
        </p>
      </div>
    );
  }

  const sortedClients = [...clients].sort((a, b) => {
    const statusA = getStatus(a);
    const statusB = getStatus(b);

    if (statusA === 'INACTIVE' && statusB !== 'INACTIVE') return 1;
    if (statusB === 'INACTIVE' && statusA !== 'INACTIVE') return -1;

    if (statusA === 'EXPIRED' && statusB !== 'EXPIRED') return -1;
    if (statusB === 'EXPIRED' && statusA !== 'EXPIRED') return 1;

    if (statusA === 'EXPIRED' && statusB === 'EXPIRED') {
       return getDaysSince(b.expirationDate) - getDaysSince(a.expirationDate);
    }

    if (statusA === 'MESSAGE_SENT' && statusB === 'MESSAGE_SENT') {
      const timeA = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
      const timeB = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
      return timeA - timeB;
    }

    return a.expirationDate.localeCompare(b.expirationDate);
  });

  return (
    <div className="space-y-4">
      {sortedClients.map((client) => {
        const status = getStatus(client);
        const daysSinceExp = getDaysSince(client.expirationDate);
        const isRecentlyClicked = clickedWhatsappId === client.id;
        const isInactive = status === 'INACTIVE';
        
        const statusConfig = {
          ACTIVE: { color: 'bg-green-100 text-green-700', label: 'Ativo' },
          EXPIRED: { color: 'bg-red-100 text-red-700', label: 'Vencido' },
          MESSAGE_SENT: { color: 'bg-blue-100 text-blue-700', label: 'Msg Enviada' },
          INACTIVE: { color: 'bg-gray-200 text-gray-500', label: 'Inativo' }
        };

        return (
          <div key={client.id} className={`bg-white rounded-3xl p-5 shadow-sm border border-gray-100 transition-all duration-300 ${isInactive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 leading-tight">{client.name}</h3>
                <div className="flex flex-col mt-0.5">
                  <span className="text-blue-600 text-[10px] font-black uppercase tracking-tight">Usuário: {client.user || 'N/A'}</span>
                  <span className="text-gray-400 text-sm font-medium">{client.whatsapp}</span>
                </div>
              </div>
              <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${statusConfig[status].color}`}>
                {statusConfig[status].label}
              </span>
            </div>

            <div className="mt-3">
              {daysSinceExp > 0 ? (
                <p className={`${isInactive ? 'text-gray-400' : 'text-red-500'} text-xs font-black uppercase`}>Vencido há {daysSinceExp} dias</p>
              ) : (
                <p className={`${isInactive ? 'text-gray-400' : 'text-green-500'} text-xs font-black uppercase`}>
                  {daysSinceExp === 0 ? 'Vence HOJE' : `Vence em ${Math.abs(daysSinceExp)} dias`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50">
              <div className="text-sm">
                <p className="text-gray-400 font-bold text-[10px] uppercase">Vencimento</p>
                <p className="font-bold text-gray-700">{formatDateBR(client.expirationDate)}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-gray-400 font-bold text-[10px] uppercase">Valor Ciclo</p>
                <p className="font-bold text-blue-600">{formatCurrency(client.value)}</p>
              </div>
            </div>

            {client.lastMessageDate && (
              <div className="mt-3 text-[10px] text-gray-400 font-medium flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                </svg>
                Contatado em: {formatDateTimeBR(client.lastMessageDate)}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-4">
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => sendWhatsApp(client)}
                  disabled={isInactive}
                  className={`flex-1 ${isInactive ? 'bg-gray-300' : (isRecentlyClicked ? 'bg-green-600' : 'bg-green-500')} text-white font-black py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest`}
                >
                  {isRecentlyClicked ? 'Enviado!' : 'WhatsApp'}
                </button>
                <button
                  onClick={() => onRenew(client.id)}
                  disabled={isInactive}
                  className={`flex-1 ${isInactive ? 'bg-gray-400' : 'bg-blue-600'} text-white font-black py-3.5 rounded-2xl shadow-md active:scale-95 transition-transform text-xs uppercase tracking-widest`}
                >
                  Renovar
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full mt-1">
                <button
                   onClick={() => setShowHistoryId(showHistoryId === client.id ? null : client.id)}
                   className="flex-1 min-w-[100px] bg-gray-50 text-gray-500 font-black py-2.5 rounded-xl text-[9px] uppercase tracking-widest active:scale-95"
                >
                  {showHistoryId === client.id ? 'Fechar' : 'Histórico'}
                </button>
                
                <button
                  onClick={() => onToggleActive(client.id)}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-colors ${isInactive ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}
                >
                  {isInactive ? 'Ativar' : 'Inativar'}
                </button>

                <button
                  onClick={() => onEdit(client)}
                  className="bg-gray-100 text-gray-600 font-black py-2.5 px-4 rounded-xl text-[9px] uppercase tracking-widest active:scale-95"
                >
                  Editar
                </button>
              </div>
            </div>

            {showHistoryId === client.id && client.renewalHistory && client.renewalHistory.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-2xl space-y-2 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Histórico de Pagamentos</p>
                {client.renewalHistory.slice().reverse().map((h) => (
                  <div key={h.id} className="flex justify-between items-center text-[11px] border-b border-white pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-col">
                      <span className="text-gray-500 font-medium">{formatDateBR(h.createdAt)}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">{h.durationMonths} {h.durationMonths === 1 ? 'mês' : 'meses'}</span>
                    </div>
                    <span className="font-black text-gray-800">{formatCurrency(h.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ClientList;
