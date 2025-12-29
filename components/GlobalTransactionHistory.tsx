
import React, { useState, useMemo } from 'react';
import { Client } from '../types';
import { formatDateBR, formatCurrency } from '../utils/dateUtils';
// Fix: Import specific functions from sub-paths to avoid barrel file resolution errors
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
import { isSameMonth } from 'date-fns/isSameMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { isSameDay } from 'date-fns/isSameDay';
// Fix: Use correct direct sub-path for pt-BR locale
import { ptBR } from 'date-fns/locale/pt-BR';

interface Props {
  clients: Client[];
}

type FilterType = 'day' | 'week' | 'month';

const GlobalTransactionHistory: React.FC<Props> = ({ clients }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('day');
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  const allTransactions = useMemo(() => {
    return clients.flatMap(client => 
      (client.renewalHistory || []).map(renewal => ({
        ...renewal,
        clientName: client.name
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [clients]);

  const now = new Date();
  const currentMonthTotal = allTransactions
    .filter(tx => isSameMonth(parseISO(tx.createdAt), now))
    .reduce((acc, tx) => acc + tx.value, 0);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: { label: string, sublabel: string, total: number, count: number, transactions: any[] } } = {};

    allTransactions.forEach(tx => {
      const date = parseISO(tx.createdAt);
      let key = '';
      let label = '';
      let sublabel = '';

      if (activeFilter === 'day') {
        key = tx.createdAt.split('T')[0];
        label = formatDateBR(key);
        sublabel = isSameDay(date, now) ? 'Hoje' : '';
      } else if (activeFilter === 'week') {
        const start = startOfWeek(date, { weekStartsOn: 0 });
        const end = endOfWeek(date, { weekStartsOn: 0 });
        key = format(start, 'yyyy-ww');
        label = `Semana de ${format(start, 'dd/MM')}`;
        sublabel = `Até ${format(end, 'dd/MM')}`;
      } else {
        key = format(date, 'yyyy-MM');
        label = format(date, 'MMMM yyyy', { locale: ptBR });
        sublabel = isSameMonth(date, now) ? 'Mês Atual' : '';
      }

      if (!groups[key]) {
        groups[key] = { label, sublabel, total: 0, count: 0, transactions: [] };
      }
      groups[key].total += tx.value;
      groups[key].count += 1;
      groups[key].transactions.push(tx);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allTransactions, activeFilter]);

  // Encontra o maior valor do grupo para a escala visual
  const maxGroupValue = useMemo(() => {
    return Math.max(...groupedTransactions.map(([_, g]) => g.total), 1);
  }, [groupedTransactions]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatValue = (val: number) => isPrivacyMode ? 'R$ ••••••' : formatCurrency(val);

  if (allTransactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300 px-6">
        <p className="text-gray-400 font-medium font-black uppercase tracking-widest text-[10px]">Sem movimentação</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Card com Modo Privacidade */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Mensal</p>
            <h3 className="text-sm font-black uppercase">{format(now, 'MMMM yyyy', { locale: ptBR })}</h3>
          </div>
          <button 
            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
            className="bg-white/20 p-2.5 rounded-2xl hover:bg-white/30 transition-colors"
          >
            {isPrivacyMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-4xl font-black relative z-10 transition-all">
          {formatValue(currentMonthTotal)}
        </p>
      </div>

      {/* Seletor de Filtro - Estilo Android Moderno */}
      <div className="bg-gray-100 p-1.5 rounded-[2rem] flex items-center gap-1 shadow-inner border border-gray-200">
        {(['day', 'week', 'month'] as FilterType[]).map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setActiveFilter(filter);
              setExpandedGroups({}); // Garante que comece oculto ao trocar filtro
            }}
            className={`flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              activeFilter === filter 
                ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {filter === 'day' ? 'Dia' : filter === 'week' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      {/* Lista de Grupos */}
      <div className="space-y-3">
        {groupedTransactions.map(([key, group]) => {
          const isExpanded = expandedGroups[key];
          const percentage = (group.total / maxGroupValue) * 100;
          
          return (
            <div key={key} className={`bg-white rounded-[2rem] border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-blue-200 shadow-xl ring-1 ring-blue-50' : 'border-gray-100 shadow-sm'}`}>
              {/* Barra de Progresso Visual de fundo */}
              <div className="h-1 w-full bg-gray-50 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>

              {/* Cabeçalho */}
              <button 
                onClick={() => toggleGroup(key)}
                className="w-full text-left p-5 flex justify-between items-center outline-none active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 rotate-90' : 'bg-gray-50 text-gray-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-tighter leading-none">
                      {group.label}
                    </h3>
                    <p className="text-[9px] text-gray-400 font-black uppercase mt-1.5 tracking-widest flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      {group.count} {group.count === 1 ? 'entrada' : 'entradas'}
                      {group.sublabel && <span className="text-blue-500 ml-1 opacity-70">| {group.sublabel}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-gray-900 leading-none">{formatValue(group.total)}</p>
                </div>
              </button>

              {/* Lista Detalhada */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="h-px bg-gray-100 w-full mb-4"></div>
                  {group.transactions.map((tx) => (
                    <div key={tx.id} className="bg-gray-50/50 rounded-2xl p-4 flex items-center justify-between border border-gray-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 shrink-0">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                           </svg>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="font-bold text-gray-800 text-xs truncate uppercase tracking-tight">{tx.clientName}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] text-gray-400 font-black uppercase">
                              {activeFilter === 'day' 
                                ? tx.createdAt.split('T')[1].substring(0, 5)
                                : formatDateBR(tx.createdAt.split('T')[0])
                              }
                            </span>
                            <span className="text-[8px] text-blue-600 font-black uppercase tracking-tighter bg-blue-50 px-1 rounded">
                              {tx.durationMonths}M
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-green-600">
                          {formatValue(tx.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="h-24"></div>
    </div>
  );
};

export default GlobalTransactionHistory;