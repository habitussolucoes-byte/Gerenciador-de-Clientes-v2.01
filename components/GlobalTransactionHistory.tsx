
import React, { useState, useMemo } from 'react';
import { Client } from '../types';
import { formatDateBR, formatCurrency } from '../utils/dateUtils';
import { format, isSameMonth, endOfWeek, isSameDay } from 'date-fns';
// Fix: Import from subpaths to resolve missing export issues in some environments
import parseISO from 'date-fns/parseISO';
import startOfWeek from 'date-fns/startOfWeek';
import ptBR from 'date-fns/locale/pt-BR';

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

  const maxGroupValue = useMemo(() => {
    return Math.max(...groupedTransactions.map(([_, g]) => g.total), 1);
  }, [groupedTransactions]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
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
      <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 relative z-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Mensal</p>
            <h3 className="text-sm font-black uppercase">{format(now, 'MMMM yyyy', { locale: ptBR })}</h3>
          </div>
          <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="bg-white/20 p-2.5 rounded-2xl hover:bg-white/30 transition-colors">
            {isPrivacyMode ? 'Ver' : 'Ocultar'}
          </button>
        </div>
        <p className="text-4xl font-black relative z-10">{formatValue(currentMonthTotal)}</p>
      </div>

      <div className="bg-gray-100 p-1.5 rounded-[2rem] flex items-center gap-1 shadow-inner border border-gray-200">
        {(['day', 'week', 'month'] as FilterType[]).map((filter) => (
          <button key={filter} onClick={() => { setActiveFilter(filter); setExpandedGroups({}); }} className={`flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>
            {filter === 'day' ? 'Dia' : filter === 'week' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {groupedTransactions.map(([key, group]) => (
          <div key={key} className={`bg-white rounded-[2rem] border transition-all ${expandedGroups[key] ? 'border-blue-200 shadow-xl' : 'border-gray-100'}`}>
            <button onClick={() => toggleGroup(key)} className="w-full text-left p-5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${expandedGroups[key] ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                  +
                </div>
                <div>
                  <h3 className="text-[13px] font-black text-gray-800 uppercase leading-none">{group.label}</h3>
                  <p className="text-[9px] text-gray-400 font-black uppercase mt-1.5 tracking-widest">{group.count} entradas</p>
                </div>
              </div>
              <p className="text-lg font-black text-gray-900 leading-none">{formatValue(group.total)}</p>
            </button>
            {expandedGroups[key] && (
              <div className="px-5 pb-5 space-y-2">
                <div className="h-px bg-gray-100 w-full mb-4"></div>
                {group.transactions.map((tx) => (
                  <div key={tx.id} className="bg-gray-50/50 rounded-2xl p-4 flex items-center justify-between border border-gray-100/50">
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-bold text-gray-800 text-xs truncate uppercase">{tx.clientName}</h4>
                      <span className="text-[8px] text-gray-400 font-black uppercase mt-0.5">
                        {activeFilter === 'day' ? tx.createdAt.split('T')[1].substring(0, 5) : formatDateBR(tx.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-black text-green-600">{formatValue(tx.value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="h-24"></div>
    </div>
  );
};

export default GlobalTransactionHistory;