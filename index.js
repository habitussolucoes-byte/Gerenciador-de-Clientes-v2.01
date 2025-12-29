
// --- CONFIGURAÇÕES DE PERSISTÊNCIA ---
const STORAGE_KEY = 'tv_manager_final_v1';
const SETTINGS_KEY = 'tv_manager_settings_final_v1';

let state = {
  clients: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
  settings: JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify({
    tplUpcoming: "Olá {{nome}}! Tudo bem?\n\nIdentificamos que sua assinatura TV Online está para vencer no dia {{vencimento}}.\n\nValor: {{valor}}\nUsuário: {{usuario}}",
    tplExpired: "Olá {{nome}}! Notamos que sua assinatura venceu no dia {{vencimento}}.\n\nGostaria de renovar?"
  })),
  activeTab: 'clients',
  searchTerm: '',
  showAll: false,
  financeFilter: 'day',
  expandedGroups: {}
};

const save = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
};

// --- FERRAMENTAS DE DATA ---
const parseDate = (s) => s ? new Date(s + 'T12:00:00') : new Date();
const formatISO = (d) => d.toISOString().split('T')[0];
const formatBR = (s) => s ? s.split('-').reverse().join('/') : '-';
const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const getDaysDiff = (dateStr) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = parseDate(dateStr); target.setHours(0,0,0,0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0,0,0,0);
  return start;
};

const getStatus = (c) => {
  if (c.isActive === false) return 'INACTIVE';
  const diff = getDaysDiff(c.expirationDate);
  if (diff < 0) {
    if (c.lastMessageDate) {
      const msgDate = c.lastMessageDate.split('T')[0];
      if (msgDate >= c.expirationDate) return 'MESSAGE_SENT';
    }
    return 'EXPIRED';
  }
  return 'ACTIVE';
};

// --- MOTOR PRINCIPAL ---
const app = {
  setTab: (tab) => {
    state.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
      const active = b.id === `tab-${tab}`;
      b.className = `tab-btn flex-1 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-tighter transition-all flex items-center justify-center gap-2 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`;
    });
    app.render();
  },

  render: () => {
    const container = document.getElementById('app-content');
    if (state.activeTab === 'clients') app.renderClients(container);
    if (state.activeTab === 'finances') app.renderFinances(container);
    if (state.activeTab === 'settings') app.renderSettings(container);
  },

  renderClients: (container) => {
    const activeClients = state.clients.filter(c => getStatus(c) === 'ACTIVE');
    const expiredCount = state.clients.filter(c => getStatus(c) === 'EXPIRED').length;
    const msgSentCount = state.clients.filter(c => getStatus(c) === 'MESSAGE_SENT').length;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(now.getDate() - 30);

    const history = state.clients.flatMap(c => c.renewalHistory || []);
    const totalRevenue = history.reduce((acc, h) => acc + (parseFloat(h.value) || 0), 0);
    const last30DaysRevenue = history.reduce((acc, h) => {
      const d = new Date(h.createdAt);
      return d >= thirtyDaysAgo ? acc + (parseFloat(h.value) || 0) : acc;
    }, 0);
    const totalMonths = history.reduce((acc, h) => acc + (parseInt(h.duration) || 0), 0);

    const forecast = state.clients.reduce((acc, c) => {
      if (c.isActive === false) return acc;
      const diff = getDaysDiff(c.expirationDate);
      return (diff >= -30 && diff <= 30) ? acc + (parseFloat(c.value) || 0) : acc;
    }, 0);

    const filtered = state.clients.filter(c => {
      const matches = c.name.toLowerCase().includes(state.searchTerm.toLowerCase()) || 
                      c.user.toLowerCase().includes(state.searchTerm.toLowerCase());
      if (state.searchTerm) return matches;
      if (state.showAll) return true;
      return getDaysDiff(c.expirationDate) <= 3 && c.isActive !== false;
    }).sort((a,b) => getDaysDiff(a.expirationDate) - getDaysDiff(b.expirationDate));

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-20">
        <!-- Dashboard Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-white p-5 rounded-[2.2rem] shadow-sm border border-gray-100">
            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ativos</p>
            <p class="text-3xl font-black text-green-600 mt-1">${activeClients.length}</p>
          </div>
          <div class="bg-white p-5 rounded-[2.2rem] shadow-sm border border-gray-100">
            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vencidos</p>
            <p class="text-3xl font-black ${expiredCount > 0 ? 'text-red-500' : 'text-gray-200'} mt-1">${expiredCount}</p>
          </div>
          
          <div class="bg-blue-50 p-5 rounded-[2.2rem] shadow-sm border border-blue-100">
            <p class="text-blue-700 text-[9px] font-black uppercase tracking-widest">Ganhos (30d)</p>
            <p class="text-lg font-black text-blue-800 mt-1">${formatCurrency(last30DaysRevenue)}</p>
          </div>

          <div class="bg-white p-5 rounded-[2.2rem] shadow-sm border border-gray-100">
            <p class="text-gray-400 text-[9px] font-black uppercase tracking-widest">Total Meses</p>
            <p class="text-lg font-black text-gray-500 mt-1">${totalMonths}</p>
          </div>

          <div class="col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2.8rem] shadow-xl text-white">
            <p class="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80">Previsão Próximos 30 Dias</p>
            <p class="text-4xl font-black mt-1">${formatCurrency(forecast)}</p>
            <div class="mt-6 pt-5 border-t border-white/10 flex justify-between items-center">
              <span class="text-[8px] font-bold uppercase tracking-widest text-blue-200 italic">Soma de vencimentos próximos</span>
              <button onclick="app.modalAdd()" class="bg-white text-blue-600 w-12 h-12 rounded-full font-black shadow-xl flex items-center justify-center active:scale-90 transition-transform text-xl">+</button>
            </div>
          </div>
          
          <div class="col-span-2 flex justify-center gap-4 py-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
              <div class="text-center">
                <p class="text-gray-400 text-[8px] font-black uppercase tracking-widest">Msg Enviada</p>
                <p class="text-xs font-black text-blue-600">${msgSentCount}</p>
              </div>
              <div class="w-[1px] h-4 bg-gray-200 self-center"></div>
              <div class="text-center">
                <p class="text-gray-400 text-[8px] font-black uppercase tracking-widest">Faturamento Total</p>
                <p class="text-xs font-black text-gray-400">${formatCurrency(totalRevenue)}</p>
              </div>
          </div>
        </div>

        <!-- Filtros e Busca -->
        <div class="space-y-3">
          <input type="text" placeholder="Pesquisar..." oninput="app.search(this.value)" value="${state.searchTerm}" 
                 class="w-full bg-white border border-gray-100 rounded-2xl p-4.5 font-bold text-sm shadow-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all">
          <div class="flex justify-between items-center px-2">
            <button onclick="app.toggleShowAll()" class="text-[9px] font-black uppercase tracking-widest ${state.showAll ? 'text-blue-600' : 'text-gray-300'}">
              ${state.showAll ? 'Ver Apenas Próximos' : 'Ver Toda a Base'}
            </button>
          </div>
        </div>

        <div class="space-y-4">
          ${filtered.map(c => {
            const status = getStatus(c);
            const diff = getDaysDiff(c.expirationDate);
            const badge = {
              ACTIVE: `<span class="bg-green-100 text-green-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Ativo</span>`,
              EXPIRED: `<span class="bg-red-100 text-red-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Vencido</span>`,
              MESSAGE_SENT: `<span class="bg-blue-100 text-blue-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Contatado</span>`,
              INACTIVE: `<span class="bg-gray-100 text-gray-400 text-[9px] font-black px-3 py-1 rounded-full uppercase">Inativo</span>`
            }[status];
            
            return `
              <div class="bg-white p-6 rounded-[2.8rem] shadow-sm border border-gray-100 animate-fade-in ${status === 'INACTIVE' ? 'opacity-50 grayscale' : ''}">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="font-black text-gray-800 text-base leading-none tracking-tight">${c.name}</h3>
                    <p class="text-[9px] font-black text-blue-600 uppercase mt-2">Login: ${c.user || 'N/A'}</p>
                  </div>
                  ${badge}
                </div>
                <div class="grid grid-cols-2 gap-4 border-y border-gray-50 py-4 my-4">
                  <div>
                    <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Expiração</p>
                    <p class="text-xs font-black text-gray-700">${formatBR(c.expirationDate)}</p>
                    <p class="text-[9px] font-bold ${diff < 0 ? 'text-red-500' : 'text-green-500'} uppercase mt-1">
                      ${diff < 0 ? `Atrasado ${Math.abs(diff)}d` : (diff === 0 ? 'Vence HOJE!' : `Em ${diff} dias`)}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Valor</p>
                    <p class="text-sm font-black text-blue-600">${formatCurrency(c.value)}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2.5 mt-4">
                  <button onclick="app.whatsapp('${c.id}')" class="bg-green-500 text-white text-[10px] font-black uppercase py-4 rounded-2xl shadow-lg active:scale-95 transition-all">WhatsApp</button>
                  <button onclick="app.modalRenew('${c.id}')" class="bg-blue-600 text-white text-[10px] font-black uppercase py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Renovar</button>
                </div>
                <div class="flex justify-between mt-5 px-1">
                   <button onclick="app.modalEdit('${c.id}')" class="text-[8px] font-black text-gray-300 uppercase hover:text-blue-500">Editar</button>
                   <button onclick="app.toggleActive('${c.id}')" class="text-[8px] font-black text-gray-300 uppercase hover:text-orange-500">${status === 'INACTIVE' ? 'Reativar' : 'Inativar'}</button>
                </div>
              </div>`;
          }).join('') || '<p class="text-center py-20 text-[10px] font-black text-gray-300 uppercase tracking-widest">Nada encontrado</p>'}
        </div>
      </div>
    `;
  },

  renderFinances: (container) => {
    const history = state.clients.flatMap(c => (c.renewalHistory || []).map(h => ({ ...h, clientName: c.name })));
    const totalAccumulated = history.reduce((acc, h) => acc + (parseFloat(h.value) || 0), 0);
    const now = new Date();
    
    // Agrupamento
    const groups = {};
    history.forEach(h => {
      const date = new Date(h.createdAt);
      let key, label, sublabel;

      if (state.financeFilter === 'day') {
        key = h.createdAt.split('T')[0];
        label = formatBR(key);
        sublabel = (key === formatISO(now)) ? 'Hoje' : '';
      } else if (state.financeFilter === 'week') {
        const start = getStartOfWeek(date);
        key = formatISO(start);
        label = `Semana de ${formatBR(key).substring(0,5)}`;
        const end = new Date(start); end.setDate(end.getDate() + 6);
        sublabel = `Até ${formatBR(formatISO(end)).substring(0,5)}`;
      } else {
        key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}`;
        label = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        sublabel = 'Total Mensal';
      }

      if (!groups[key]) groups[key] = { label, sublabel, total: 0, transactions: [] };
      groups[key].total += (parseFloat(h.value) || 0);
      groups[key].transactions.push(h);
    });

    const sortedGroups = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-20">
        <div class="bg-green-600 p-8 rounded-[2.8rem] shadow-xl text-white">
          <p class="text-green-100 text-[10px] font-black uppercase tracking-widest opacity-80">Faturamento Geral</p>
          <p class="text-4xl font-black mt-2 leading-none">${formatCurrency(totalAccumulated)}</p>
        </div>
        
        <div class="bg-gray-100 p-1.5 rounded-[2.2rem] flex items-center gap-1 shadow-inner">
          ${['day', 'week', 'month'].map(f => `
            <button onclick="app.setFinanceFilter('${f}')" 
                    class="flex-1 py-3.5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${state.financeFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}">
              ${f === 'day' ? 'Dia' : f === 'week' ? 'Semana' : 'Mês'}
            </button>
          `).join('')}
        </div>

        <div class="space-y-4">
          ${sortedGroups.map(([key, group]) => {
            const isExpanded = state.expandedGroups[key];
            return `
              <div class="bg-white rounded-[2.5rem] border ${isExpanded ? 'border-blue-100 shadow-md' : 'border-gray-100'} transition-all overflow-hidden">
                <button onclick="app.toggleFinanceGroup('${key}')" class="w-full text-left p-6 flex justify-between items-center outline-none">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 class="text-[11px] font-black text-gray-800 uppercase tracking-tighter">${group.label}</h4>
                      <p class="text-[8px] font-black text-blue-500 uppercase mt-1 tracking-widest opacity-80">${group.sublabel || group.transactions.length + ' Entradas'}</p>
                    </div>
                  </div>
                  <p class="text-sm font-black text-gray-900">${formatCurrency(group.total)}</p>
                </button>
                ${isExpanded ? `
                  <div class="px-6 pb-6 space-y-2 animate-fade-in border-t border-gray-50 pt-4">
                    ${group.transactions.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(tx => `
                      <div class="bg-gray-50/50 p-4 rounded-2xl flex justify-between items-center border border-gray-50">
                        <div>
                          <p class="font-black text-gray-800 text-[11px] tracking-tight">${tx.clientName}</p>
                          <p class="text-[8px] text-gray-400 font-bold uppercase mt-0.5">${formatBR(tx.createdAt.split('T')[0])}</p>
                        </div>
                        <span class="text-xs font-black text-green-600">${formatCurrency(tx.value)}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('') || '<p class="text-center py-20 text-[9px] text-gray-400 font-bold uppercase tracking-widest">Nenhuma movimentação</p>'}
        </div>
      </div>
    `;
  },

  renderSettings: (container) => {
    container.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-20">
        <div class="bg-white p-7 rounded-[2.8rem] shadow-sm border border-gray-100">
          <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Configurações de Mensagens</h3>
          <div class="space-y-5">
            <div>
              <label class="text-[9px] font-black text-gray-300 uppercase ml-1">Próximo ao Vencimento</label>
              <textarea onchange="app.saveSetting('tplUpcoming', this.value)" class="w-full bg-gray-50 rounded-2xl p-4 text-xs font-bold border-0 mt-2 min-h-[110px] outline-none">${state.settings.tplUpcoming}</textarea>
            </div>
            <div>
              <label class="text-[9px] font-black text-gray-300 uppercase ml-1">Após Vencimento</label>
              <textarea onchange="app.saveSetting('tplExpired', this.value)" class="w-full bg-gray-50 rounded-2xl p-4 text-xs font-bold border-0 mt-2 min-h-[110px] outline-none">${state.settings.tplExpired}</textarea>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="app.exportCSV()" class="bg-white border border-gray-100 text-gray-600 font-black py-4 rounded-[1.8rem] text-[9px] uppercase tracking-widest shadow-sm active:scale-95">Exportar CSV</button>
          <button onclick="app.exportJSON()" class="bg-white border border-gray-100 text-gray-600 font-black py-4 rounded-[1.8rem] text-[9px] uppercase tracking-widest shadow-sm active:scale-95">Exportar JSON</button>
        </div>
      </div>
    `;
  },

  setFinanceFilter: (f) => { state.financeFilter = f; state.expandedGroups = {}; app.render(); },
  toggleFinanceGroup: (k) => { state.expandedGroups[k] = !state.expandedGroups[k]; app.render(); },
  search: (v) => { state.searchTerm = v; app.render(); },
  toggleShowAll: () => { state.showAll = !state.showAll; app.render(); },
  saveSetting: (key, val) => { state.settings[key] = val; save(); },
  toggleActive: (id) => {
    const c = state.clients.find(x => x.id === id);
    c.isActive = !c.isActive;
    save(); app.render();
  },

  modalAdd: () => {
    app.showModal(`
      <h2 class="text-2xl font-black text-gray-800 mb-2 tracking-tighter">Novo Cliente</h2>
      <p class="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-8">Cadastro Completo</p>
      <form onsubmit="app.addClient(event)" class="space-y-4">
        <div>
          <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Nome Completo</label>
          <input type="text" name="name" placeholder="João Silva" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm mt-1 outline-none focus:ring-2 focus:ring-blue-100" required>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Login</label>
            <input type="text" name="user" placeholder="Login" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm mt-1 outline-none">
          </div>
          <div>
            <label class="text-[10px] font-black text-gray-400 uppercase ml-1">WhatsApp</label>
            <input type="tel" name="whatsapp" placeholder="DDD + Número" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm mt-1 outline-none" required>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Valor R$</label>
            <input type="number" step="0.01" name="value" placeholder="30.00" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm text-blue-600 mt-1" required>
          </div>
          <div>
            <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Plano</label>
            <select name="months" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm mt-1">
              <option value="1">1 Mês</option>
              <option value="2">2 Meses</option>
              <option value="3">3 Meses</option>
              <option value="6">6 Meses</option>
              <option value="12">1 Ano</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] font-black text-orange-400 uppercase ml-1">Data Pagto</label>
            <input type="date" name="regDate" value="${formatISO(new Date())}" class="w-full bg-orange-50/50 p-4 rounded-2xl font-bold text-[11px] mt-1">
          </div>
          <div>
            <label class="text-[10px] font-black text-blue-400 uppercase ml-1">Início Acesso</label>
            <input type="date" name="startDate" value="${formatISO(new Date())}" class="w-full bg-blue-50/50 p-4 rounded-2xl font-bold text-[11px] mt-1">
          </div>
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white font-black py-5 rounded-[2.2rem] text-xs uppercase shadow-xl mt-6 active:scale-95 transition-all">Cadastrar e Ativar</button>
      </form>
    `);
  },

  addClient: (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const regDate = f.get('regDate');
    const startDate = f.get('startDate');
    const val = parseFloat(f.get('value'));
    const months = parseInt(f.get('months'));
    const expDate = parseDate(startDate);
    expDate.setMonth(expDate.getMonth() + months);

    const newClient = {
      id: Date.now().toString(),
      name: f.get('name'),
      user: f.get('user'),
      whatsapp: f.get('whatsapp'),
      value: val,
      startDate: startDate,
      registrationDate: regDate,
      expirationDate: formatISO(expDate),
      isActive: true,
      renewalHistory: [{ id: Date.now().toString(), createdAt: regDate + 'T12:00:00', value: val, duration: months }]
    };

    state.clients.push(newClient);
    save(); app.closeModal(); app.render();
  },

  modalRenew: (id) => {
    const c = state.clients.find(x => x.id === id);
    app.showModal(`
      <h2 class="text-2xl font-black text-gray-800 mb-2">Renovar</h2>
      <p class="text-[10px] font-black text-gray-400 uppercase mb-8 tracking-widest">${c.name}</p>
      <form onsubmit="app.renewClient(event, '${id}')" class="space-y-4">
        <select name="months" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm mt-1">
          <option value="1">1 Mês</option>
          <option value="3">3 Meses</option>
          <option value="6">6 Meses</option>
          <option value="12">1 Ano</option>
        </select>
        <input type="number" step="0.01" name="value" value="${c.value}" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm text-green-600 mt-1" required>
        <button type="submit" class="w-full bg-green-600 text-white font-black py-5 rounded-[2.2rem] text-xs uppercase shadow-xl mt-4 active:scale-95 transition-all">Confirmar</button>
      </form>
    `);
  },

  renewClient: (e, id) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const m = parseInt(f.get('months'));
    const v = parseFloat(f.get('value'));
    const c = state.clients.find(x => x.id === id);
    const baseDate = getDaysDiff(c.expirationDate) < 0 ? new Date() : parseDate(c.expirationDate);
    baseDate.setMonth(baseDate.getMonth() + m);
    c.expirationDate = formatISO(baseDate);
    c.isActive = true;
    c.renewalHistory.push({ id: Date.now().toString(), createdAt: new Date().toISOString(), value: v, duration: m });
    save(); app.closeModal(); app.render();
  },

  whatsapp: (id) => {
    const c = state.clients.find(x => x.id === id);
    const status = getStatus(c);
    let msg = (status === 'EXPIRED' || status === 'MESSAGE_SENT') ? state.settings.tplExpired : state.settings.tplUpcoming;
    msg = msg.replace(/{{nome}}/g, c.name).replace(/{{vencimento}}/g, formatBR(c.expirationDate)).replace(/{{valor}}/g, formatCurrency(c.value)).replace(/{{usuario}}/g, c.user || 'N/A');
    c.lastMessageDate = new Date().toISOString();
    save();
    window.open(`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    app.render();
  },

  exportCSV: () => {
    const headers = ['Nome', 'Usuario', 'WhatsApp', 'Valor', 'Vencimento', 'Ativo'];
    const rows = state.clients.map(c => [c.name, c.user || '', c.whatsapp, c.value, c.expirationDate, c.isActive ? 'Sim' : 'Não']);
    const csvContent = "\uFEFF" + headers.join(',') + "\n" + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_tv_manager.csv`;
    link.click();
  },

  exportJSON: () => {
    const data = JSON.stringify({ clients: state.clients, settings: state.settings });
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tv_manager_backup.json`;
    link.click();
  },

  showModal: (html) => {
    document.getElementById('modal-container').innerHTML = html + `<button onclick="app.closeModal()" class="w-full mt-8 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fechar</button>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },
  
  closeModal: () => {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.body.classList.remove('modal-open');
  },

  modalEdit: (id) => {
    const c = state.clients.find(x => x.id === id);
    app.showModal(`
      <h2 class="text-2xl font-black text-gray-800 mb-6 tracking-tighter">Editar Cadastro</h2>
      <form onsubmit="app.updateClient(event, '${id}')" class="space-y-4">
        <input type="text" name="name" value="${c.name}" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm" required>
        <div class="grid grid-cols-2 gap-3">
          <input type="text" name="user" value="${c.user || ''}" class="bg-gray-50 p-4 rounded-2xl font-bold text-sm">
          <input type="tel" name="whatsapp" value="${c.whatsapp}" class="bg-gray-50 p-4 rounded-2xl font-bold text-sm" required>
        </div>
        <input type="number" step="0.01" name="value" value="${c.value}" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm text-blue-600" required>
        <div class="pt-6 flex gap-3">
          <button type="button" onclick="app.deleteClient('${id}')" class="bg-red-50 text-red-500 text-[10px] font-black uppercase px-6 py-4 rounded-2xl">Excluir</button>
          <button type="submit" class="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl text-xs uppercase shadow-lg">Salvar</button>
        </div>
      </form>
    `);
  },

  updateClient: (e, id) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const c = state.clients.find(x => x.id === id);
    c.name = f.get('name');
    c.user = f.get('user');
    c.whatsapp = f.get('whatsapp');
    c.value = parseFloat(f.get('value'));
    save(); app.closeModal(); app.render();
  },

  deleteClient: (id) => {
    if (confirm('Excluir permanentemente?')) {
      state.clients = state.clients.filter(x => x.id !== id);
      save(); app.closeModal(); app.render();
    }
  },

  init: () => {
    app.render();
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') app.closeModal();
    });
  }
};

window.app = app;
app.init();
