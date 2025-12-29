
import React, { useState } from 'react';
import { Client } from '../types';
import { formatCurrency, calculateExpiration } from '../utils/dateUtils';

interface Props {
  client: Client;
  onConfirm: (duration: number, value: number) => void;
  onCancel: () => void;
}

const RenewalModal: React.FC<Props> = ({ client, onConfirm, onCancel }) => {
  const [duration, setDuration] = useState(client.durationMonths);
  const [value, setValue] = useState(client.value);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-2 text-gray-800">Renovar Assinatura</h2>
        <p className="text-sm text-gray-500 mb-6">Cliente: <span className="font-bold text-gray-700">{client.name}</span></p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tempo de Renovação</label>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 6].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`py-3 rounded-xl font-bold border-2 transition-all ${duration === m ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}
                >
                  {m} {m === 1 ? 'Mês' : 'Meses'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor Pago (R$)</label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-50 border-0 rounded-2xl p-4 font-bold text-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl active:scale-95 transition-transform"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(duration, value)}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewalModal;
