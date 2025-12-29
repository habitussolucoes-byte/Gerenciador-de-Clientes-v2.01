
import React, { useState, useEffect } from 'react';
import { Client, DashboardStats, Renewal, AppSettings } from './types';
import { getStatus, calculateExpiration, getDaysSince } from './utils/dateUtils';
import { addDays } from 'date-fns';
// Fix: Import from subpaths to resolve missing export issues
import startOfDay from 'date-fns/startOfDay';
import parseISO from 'date-fns/parseISO';
import Dashboard from './components/Dashboard';
import ClientForm from './components/ClientForm';
import ClientList from './components/ClientList';
import RenewalModal from './components/RenewalModal';
import GlobalTransactionHistory from './components/GlobalTransactionHistory';
import Settings from './components/Settings';

const LOCAL_STORAGE_KEY = 'gerenciador_tv_clients_v2';
const SETTINGS_KEY = 'gerenciador_tv_settings_v1';

type ViewTab = 'clients' | 'transactions' | 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  messageTemplateUpcoming: "Olá {{nome}}! Tudo bem?\n\nIdentificamos que sua assinatura TV Online está para vencer no dia {{vencimento}}.\n\nPara continuar aproveitando nossos serviços, você pode realizar a renovação via Pix.\n\nValor: {{valor}}\nUsuário: {{usuario}}\n\nQualquer dúvida, estamos à disposição!",
  messageTemplateExpired: "Olá {{nome}}! Notamos que sua assinatura TV Online venceu no dia {{vencimento}}.\n\nGostaria de renovar seu acesso? O pagamento pode ser feito via Pix.\n\nValor: {{valor}}\nUsuário: {{usuario}}\n\nAguardo seu retorno!"
};

const App: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('clients');
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [renewingClient, setRenewingClient] = useState<Client | null>(null);
  const [showAllClients, setShowAllClients] = useState(false);

  useEffect(() => {
    const savedClients = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedClients) setClients(JSON.parse(savedClients));

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  const saveToStorage = (updatedClients: Client[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedClients));
    setClients(updatedClients);
  };

  const saveSettings = (updatedSettings: AppSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    setSettings(updatedSettings);
  };

  const handleAddClient = (clientData: Client & { registrationDate?: string }) => {
    const createdAtDate = clientData.registrationDate 
      ? new Date(clientData.registrationDate + 'T12:00:00Z').toISOString() 
      : new Date().toISOString();

    const newClientWithHistory: Client = {
      ...clientData,
      isActive: true,
      renewalHistory: [{
        id: Date.now().toString(),
        startDate: clientData.startDate,
        endDate: clientData.expirationDate,
        durationMonths: clientData.durationMonths,
        value: clientData.value,
        createdAt: createdAtDate
      }]
    };
    
    delete (newClientWithHistory as any).registrationDate;

    const updated = [...clients, newClientWithHistory];
    saveToStorage(updated);
    setIsAdding(false);
  };

  const handleUpdateClient = (client: Client) => {
    const updated = clients.map(c => c.id === client.id ? client : c);
    saveToStorage(updated);
    setEditingClient(null);
  };

  const handleRenewClientAction = (durationMonths: number, value: number) => {
    if (!renewingClient) return;
    
    const client = renewingClient;
    const currentStatus = getStatus(client);
    
    const baseDate = currentStatus === 'EXPIRED' || currentStatus === 'MESSAGE_SENT'
      ? new Date().toISOString().split('T')[0] 
      : client.expirationDate;
    
    const newExpiration = calculateExpiration(baseDate, durationMonths);
    
    const newRenewal: Renewal = {
      id: Date.now().toString(),
      startDate: baseDate,
      endDate: newExpiration,
      durationMonths,
      value,
      createdAt: new Date().toISOString()
    };

    const updated = clients.map(c => {
      if (c.id === client.id) {
        return {
          ...c,
          expirationDate: newExpiration,
          totalPaidValue: (c.totalPaidValue || 0) + value,
          isActive: true,
          renewalHistory: [...(c.renewalHistory || []), newRenewal]
        };
      }
      return c;
    });

    saveToStorage(updated);
    setRenewingClient(null);
  };

  const handleWhatsAppAction = (id: string) => {
    const updated = clients.map(client => {
      if (client.id === id) {
        return {
          ...client,
          lastMessageDate: new Date().toISOString()
        };
      }
      return client;
    });
    saveToStorage(updated);
  };

  const handleToggleActive = (id: string) => {
    const updated = clients.map(client => {
      if (client.id === id) {
        return {
          ...client,
          isActive: client.isActive === false ? true : false
        };
      }
      return client;
    });
    saveToStorage(updated);
  };

  const handleDeleteClient = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      const updated = clients.filter(c => c.id !== id);
      saveToStorage(updated);
    }
  };

  const today = startOfDay(new Date());
  const thirtyDaysFromNow = addDays(today, 30);
  const thirtyDaysAgo = addDays(today, -30);

  const activeClients = clients.filter(c => getStatus(c) === 'ACTIVE');
  const expiredClients = clients.filter(c => getStatus(c) === 'EXPIRED');
  const messageSentClients = clients.filter(c => getStatus(c) === 'MESSAGE_SENT');
  const inactiveClients = clients.filter(c => getStatus(c) === 'INACTIVE');
  
  const totalRev = clients.reduce((acc, c) => acc + (c.totalPaidValue || 0), 0);
  const totalMonths = clients.reduce((acc, c) => acc + (c.renewalHistory || []).reduce((sum, r) => sum + r.durationMonths, 0), 0);

  const revenueForecast = clients.reduce((acc, c) => {
    const status = getStatus(c);
    if (status === 'INACTIVE') return acc;
    const expDate = startOfDay(parseISO(c.expirationDate));
    if (expDate.getTime() <= thirtyDaysFromNow.getTime()) {
      return acc + c.value;
    }
    return acc;
  }, 0);

  const revenueLast30Days = clients.reduce((acc, client) => {
    const recentTotal = (client.renewalHistory || []).reduce((sum, renewal) => {
      const createdAt = parseISO(renewal.createdAt);
      if (createdAt.getTime() >= thirtyDaysAgo.getTime()) {
        return sum + renewal.value;
      }
      return sum;
    }, 0);
    return acc + recentTotal;
  }, 0);

  const stats: DashboardStats = {
    activeCount: activeClients.length,
    expiredCount: expiredClients.length,
    messageSentCount: messageSentClients.length,
    inactiveCount: inactiveClients.length,
    revenueForecast,
    totalRevenue: totalRev,
    averageRevenue: clients.length > 0 ? totalRev / clients.length : 0,
    revenueLast30Days,
    totalMonthsSigned: totalMonths
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.whatsapp.includes(searchTerm) ||
                         c.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (searchTerm.length > 0) return matchesSearch;
    if (showAllClients) return true;

    const daysSince = getDaysSince(c.expirationDate);
    const isUrgent = daysSince >= -3;
    const isNotInactiveManual = c.isActive !== false;

    return isUrgent && isNotInactiveManual;
  });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-32 font-sans">
      <header className="bg-blue-600 text-white p-8 shadow-md rounded-b-[3rem]">
        <h1 className="text-2xl font-black tracking-tight">TV Manager Pro</h1>
        <p className="text-sm opacity-80 font-medium">Controle de Clientes e Cobrança</p>
      </header>

      <main className="px-5 mt-[-2rem]">
        {activeTab !== 'settings' && <Dashboard stats={stats} />}

        {activeTab === 'clients' && (
          <div className="mt-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar em toda a base..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-[2rem] p-5 pl-12 font-semibold shadow-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="flex justify-between items-center mb-6 px-2">
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-gray-800">
                {activeTab === 'clients' ? (showAllClients || searchTerm ? 'Todos os Clientes' : 'Vencendo em Breve') : 
                 activeTab === 'transactions' ? 'Fluxo Financeiro' : 'Configurações'}
              </h2>
              {activeTab === 'clients' && !showAllClients && !searchTerm && (
                <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Apenas próximos 3 dias</span>
              )}
            </div>
            
            <div className="flex gap-2">
              {activeTab === 'clients' && (
                <>
                  <button
                    onClick={() => setShowAllClients(!showAllClients)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${showAllClients ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {showAllClients ? 'Ocultar' : 'Ver Todos'}
                  </button>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold shadow-xl shadow-blue-200 active:scale-95 transition-transform"
                  >
                    +
                  </button>
                </>
              )}
            </div>
          </div>

          {activeTab === 'clients' ? (
            <ClientList 
              clients={filteredClients} 
              onEdit={setEditingClient} 
              onDelete={handleDeleteClient}
              onRenew={(id) => setRenewingClient(clients.find(c => c.id === id) || null)}
              onWhatsApp={handleWhatsAppAction}
              onToggleActive={handleToggleActive}
              isSearching={searchTerm.length > 0 || showAllClients}
              settings={settings}
            />
          ) : activeTab === 'transactions' ? (
            <GlobalTransactionHistory clients={clients} />
          ) : (
            <Settings 
              settings={settings} 
              onSave={saveSettings} 
              clients={clients} 
              onImport={saveToStorage} 
            />
          )}
        </div>
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-gray-100 p-2 rounded-[2.5rem] shadow-2xl flex items-center gap-1 z-50">
        <button onClick={() => setActiveTab('clients')} className={`px-4 py-3 rounded-[2rem] font-black text-[10px] uppercase tracking-tighter transition-all flex items-center gap-1.5 ${activeTab === 'clients' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400'}`}>
          Clientes
        </button>
        <button onClick={() => setActiveTab('transactions')} className={`px-4 py-3 rounded-[2rem] font-black text-[10px] uppercase tracking-tighter transition-all flex items-center gap-1.5 ${activeTab === 'transactions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400'}`}>
          Finanças
        </button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-3 rounded-[2rem] font-black text-[10px] uppercase tracking-tighter transition-all flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400'}`}>
          Ajustes
        </button>
      </nav>

      {(isAdding || editingClient) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-sm rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black mb-8 text-gray-800">{editingClient ? 'Editar Cadastro' : 'Novo Cadastro'}</h2>
            <ClientForm 
              initialData={editingClient || undefined}
              onSubmit={editingClient ? handleUpdateClient : handleAddClient} 
              onCancel={() => { setIsAdding(false); setEditingClient(null); }}
            />
          </div>
        </div>
      )}

      {renewingClient && (
        <RenewalModal client={renewingClient} onCancel={() => setRenewingClient(null)} onConfirm={handleRenewClientAction} />
      )}
    </div>
  );
};

export default App;