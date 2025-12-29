
import React, { useState, useMemo } from 'react';
import { Client } from '../types';
import { formatDateBR, formatCurrency } from '../utils/dateUtils';
import { format, parseISO, isSameMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  clients: Client[];
}

type FilterType = 'day' | 'week' | 'month';

const GlobalTransactionHistory: React.FC<Props> = ({ clients }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('day');
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});

  // Achatar todas as renovações e adicionar o nome do cliente
  const allTransactions = useMemo(() => {
    return clients.flatMap(client => 
      (client.renewalHistory || []).map(renewal => ({
        ...renewal,
        clientName: client.name
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [clients]);

  // Lógica de agrupamento baseada no filtro
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: { label: string, sublabel: string, total: number, count: number, transactions: any[] } } = {};
    const now = new Date();

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

    const sorted = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    
    return sorted;
  }, [allTransactions, activeFilter]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (allTransactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300 px-6">
        <p className="text-gray-400 font-medium">Nenhuma transação registrada ainda.</p>
      </div>
    );
  }

  const now = new Date();
  const currentMonthTotal = allTransactions
    .filter(tx => isSameMonth(parseISO(tx.createdAt), now))
    .reduce((acc, tx) => acc + tx.value, 0);

  return (
    <div className="space-y-6">
      {/* Resumo de Destaque */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-[2.5rem] shadow-xl text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Faturamento Mensal</p>
            <h3 className="text-sm font-black uppercase">{format(now, 'MMMM yyyy', { locale: ptBR })}</h3>
          </div>
          <div className="bg-white/20 p-2 rounded-xl">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
               <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
             </svg>
          </div>
        </div>
        <p className="text-4xl font-black">{formatCurrency(currentMonthTotal)}</p>
        <p className="text-[9px] text-green-100 mt-2 font-bold uppercase tracking-widest italic opacity-80">Recebimentos totais no período mensal corrente</p>
      </div>

      {/* Seletor de Filtro */}
      <div className="bg-gray-100 p-1.5 rounded-[2rem] flex items-center gap-1">
        {(['day', 'week', 'month'] as FilterType[]).map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setActiveFilter(filter);
              setExpandedGroups({}); // Fecha tudo ao trocar o filtro também
            }}
            className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              activeFilter === filter 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-400'
            }`}
          >
            {filter === 'day' ? 'Dia' : filter === 'week' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      {/* Lista de Grupos */}
      <div className="space-y-4">
        {groupedTransactions.map(([key, group]) => {
          const isExpanded = expandedGroups[key];
          
          return (
            <div key={key} className={`bg-white rounded-[2rem] border transition-all duration-300 ${isExpanded ? 'border-blue-100 shadow-md' : 'border-gray-100'}`}>
              {/* Cabeçalho do Grupo (Clicável) */}
              <button 
                onClick={() => toggleGroup(key)}
                className="w-full text-left p-5 flex justify-between items-center outline-none"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {isExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-tighter leading-none">
                      {group.label}
                    </h3>
                    <p className="text-[9px] text-blue-500 font-black uppercase mt-1 tracking-widest">
                      {group.sublabel || `${group.count} ${group.count === 1 ? 'cliente' : 'clientes'}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Total</p>
                  <p className="text-lg font-black text-gray-900 leading-none">{formatCurrency(group.total)}</p>
                </div>
              </button>

              {/* Lista de Transações (Condicional) */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="h-px bg-gray-50 w-full mb-3"></div>
                  {group.transactions.map((tx) => (
                    <div key={tx.id} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 shrink-0">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                           </svg>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="font-bold text-gray-800 text-xs truncate">{tx.clientName}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">
                              {activeFilter === 'day' 
                                ? tx.createdAt.split('T')[1].substring(0, 5)
                                : formatDateBR(tx.createdAt.split('T')[0])
                              }
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-[8px] text-blue-600 font-black uppercase tracking-widest">
                              {tx.durationMonths} {tx.durationMonths === 1 ? 'Mês' : 'Meses'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-green-600">
                          {formatCurrency(tx.value)}
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
      
      <div className="h-20"></div>
    </div>
  );
};

export default GlobalTransactionHistory;
