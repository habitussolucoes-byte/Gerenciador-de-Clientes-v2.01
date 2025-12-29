
import React from 'react';
import { DashboardStats } from '../types';
import { formatCurrency } from '../utils/dateUtils';

interface Props {
  stats: DashboardStats;
}

const Dashboard: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
        <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Ativos</p>
        <p className="text-3xl font-black text-green-600 mt-1">{stats.activeCount}</p>
      </div>
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
        <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Vencidos</p>
        <p className={`text-3xl font-black mt-1 ${stats.expiredCount > 0 ? 'text-red-500' : 'text-gray-300'}`}>
          {stats.expiredCount}
        </p>
      </div>
      
      <div className="bg-blue-50 p-5 rounded-[2rem] shadow-sm border border-blue-100 flex flex-col justify-center">
        <p className="text-blue-700 text-[9px] font-black uppercase tracking-widest">Ganhos (30 dias)</p>
        <p className="text-lg font-black text-blue-800 mt-1">
          {formatCurrency(stats.revenueLast30Days)}
        </p>
      </div>

      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-center">
        <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Total de Meses</p>
        <p className="text-lg font-black text-gray-500 mt-1">
          {stats.totalMonthsSigned} <span className="text-[10px] font-medium text-gray-400">meses</span>
        </p>
      </div>
      
      <div className="col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2.5rem] shadow-xl shadow-blue-100">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Previsão Próx. 30 Dias</p>
            <p className="text-3xl font-black text-white mt-1">
              {formatCurrency(stats.revenueForecast)}
            </p>
          </div>
          <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
          </div>
        </div>
        <p className="text-[9px] text-blue-200 mt-3 font-bold uppercase italic tracking-widest opacity-80">
          Soma de renovações com vencimento em até 30 dias
        </p>
      </div>

      <div className="col-span-2 flex justify-center gap-4 py-1">
          <div className="text-center">
            <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest">Msg Enviada</p>
            <p className="text-xs font-black text-blue-600">{stats.messageSentCount}</p>
          </div>
          <div className="w-[1px] h-4 bg-gray-200 self-center"></div>
          <div className="text-center">
            <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest">Faturamento Total</p>
            <p className="text-xs font-black text-gray-400">{formatCurrency(stats.totalRevenue)}</p>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
