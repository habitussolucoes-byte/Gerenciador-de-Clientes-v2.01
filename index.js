
// --- UTILS DE DATA (NATIVOS) ---
const parseDate = (str) => str ? new Date(str + 'T12:00:00') : new Date();
const formatDateISO = (date) => date.toISOString().split('T')[0];
const formatDateBR = (str) => {
  if (!str) return '-';
  const parts = str.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : str;
};
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + parseInt(months));
  return d;
};
const getDaysDiff = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDate(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

// --- ESTADO INICIAL ---
const STORAGE_KEY = 'gerenciador_tv_v3_vanilla';
const SETTINGS_KEY = 'gerenciador_tv_settings_v3';

let state = {
  clients: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
  settings: JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify({
    messageTemplateUpcoming: "Olá {{nome}}! Tudo bem?\n\nSua assinatura vence em {{vencimento}}.\nValor: {{valor}}\nUsuário: {{usuario}}",
    messageTemplateExpired: "Olá {{nome}}! Notamos que sua assinatura venceu em {{vencimento}}.\n\nGostaria de renovar?"
  })),
  activeTab: 'clients',
  searchTerm: '',
  showAll: false
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
};

// --- LOGICA DE NEGÓCIO ---
const getClientStatus = (client) => {
  if (client.isActive === false) return 'INACTIVE';
  const diff = getDaysDiff(client.expirationDate);
  if (diff < 0) {
    if (client.lastMessageDate) {
      const msgDate = client.lastMessageDate.split('T')[0];
      if (msgDate >= client.expirationDate) return 'MESSAGE_SENT';
    }
    return 'EXPIRED';
  }
  return 'ACTIVE';
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- COMPONENTES DE INTERFACE ---

const renderDashboard = () => {
  const today = new Date();
  const next30 = state.clients.filter(c => {
    const status = getClientStatus(c);
    if (status === 'INACTIVE') return false;
    const diff = getDaysDiff(c.expirationDate);
    return diff >= -30 && diff <= 30;
  });

  const revenueForecast = next30.reduce((acc, c) => acc + c.value, 0);
  const activeCount = state.clients.filter(c => getClientStatus(c) === 'ACTIVE').length;
  const expiredCount = state.clients.filter(c => getClientStatus(c) === 'EXPIRED').length;

  return `
    <div class="grid grid-cols-2 gap-3 animate-fade">
      <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
        <p class="text-gray-400 text-[9px] font-black uppercase tracking-widest">Ativos</p>
        <p class="text-3xl font-black text-green-600 mt-1">${activeCount}</p>
      </div>
      <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
        <p class="text-gray-400 text-[9px] font-black uppercase tracking-widest">Vencidos</p>
        <p class="text-3xl font-black ${expiredCount > 0 ? 'text-red-500' : 'text-gray-200'} mt-1">${expiredCount}</p>
      </div>
      <div class="col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2.5rem] shadow-xl">
        <p class="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80">Previsão Próximos 30 Dias</p>
        <p class="text-3xl font-black text-white mt-1">${formatCurrency(revenueForecast)}</p>
        <p class="text-[8px] text-blue-200 mt-3 font-bold uppercase tracking-widest">Soma de renovações vindo aí</p>
      </div>
    </div>
  `;
};

const renderClientList = () => {
  const filtered = state.clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(state.searchTerm.toLowerCase()) || 
                         c.user.toLowerCase().includes(state.searchTerm.toLowerCase());
    if (state.searchTerm) return matchesSearch;
    if (state.showAll) return true;
    const diff = getDaysDiff(c.expirationDate);
    return diff <= 3 && c.isActive !== false;
  }).sort((a, b) => getDaysDiff(a.expirationDate) - getDaysDiff(b.expirationDate));

  if (filtered.length === 0) {
    return `<div class="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300 px-6 mt-6">
              <p class="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhum cliente para exibir</p>
            </div>`;
  }

  return `
    <div class="space-y-4 mt-6 animate-fade">
      ${filtered.map(c => {
        const status = getClientStatus(c);
        const diff = getDaysDiff(c.expirationDate);
        const isInactive = status === 'INACTIVE';
        
        const statusHTML = {
          ACTIVE: `<span class="bg-green-100 text-green-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Ativo</span>`,
          EXPIRED: `<span class="bg-red-100 text-red-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Vencido</span>`,
          MESSAGE_SENT: `<span class="bg-blue-100 text-blue-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Contatado</span>`,
          INACTIVE: `<span class="bg-gray-200 text-gray-500 text-[9px] font-black px-3 py-1 rounded-full uppercase">Inativo</span>`
        }[status];

        return `
          <div class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 ${isInactive ? 'opacity-60 grayscale-[0.5]' : ''}">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-black text-gray-800 leading-tight">${c.name}</h3>
                <p class="text-blue-600 text-[10px] font-black uppercase mt-0.5 tracking-tighter">Usuário: ${c.user || 'N/A'}</p>
              </div>
              ${statusHTML}
            </div>
            
            <div class="mt-3">
              <p class="text-[10px] font-black uppercase ${diff < 0 ? 'text-red-500' : 'text-green-500'}">
                ${diff < 0 ? `Vencido há ${Math.abs(diff)} dias` : (diff === 0 ? 'Vence Hoje!' : `Vence em ${diff} dias`)}
              </p>
            </div>

            <div class="flex justify-between items-end mt-4 pt-4 border-t border-gray-50">
              <div>
                <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vencimento</p>
                <p class="font-black text-gray-700">${formatDateBR(c.expirationDate)}</p>
              </div>
              <div class="text-right">
                <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Valor</p>
                <p class="font-black text-blue-600">${formatCurrency(c.value)}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-5">
              <button onclick="window.app.whatsapp('${c.id}')" class="bg-green-500 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all">WhatsApp</button>
              <button onclick="window.app.showRenew('${c.id}')" class="bg-blue-600 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all">Renovar</button>
              <button onclick="window.app.showEdit('${c.id}')" class="bg-gray-100 text-gray-600 font-black py-2.5 rounded-xl text-[9px] uppercase tracking-widest active:scale-95">Editar</button>
              <button onclick="window.app.toggleActive('${c.id}')" class="bg-gray-50 text-gray-400 font-black py-2.5 rounded-xl text-[9px] uppercase tracking-widest active:scale-95">
                ${isInactive ? 'Ativar' : 'Inativar'}
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

// --- ROTEAMENTO E RENDERIZAÇÃO ---

const renderApp = () => {
  const container = document.getElementById('app-container');
  
  if (state.activeTab === 'clients') {
    container.innerHTML = `
      ${renderDashboard()}
      <div class="mt-8 flex justify-between items-center">
        <h2 class="text-xl font-black text-gray-800">${state.showAll || state.searchTerm ? 'Todos os Clientes' : 'Próximos Vencimentos'}</h2>
        <button onclick="window.app.showAdd()" class="bg-blue-600 text-white w-10 h-10 rounded-full font-black shadow-lg shadow-blue-200 flex items-center justify-center active:scale-90">+</button>
      </div>
      <div class="relative mt-4">
        <input type="text" id="search-input" placeholder="Pesquisar nome ou usuário..." value="${state.searchTerm}" 
               class="w-full bg-white border border-gray-100 rounded-2xl p-4 font-semibold text-sm shadow-sm"
               oninput="window.app.search(this.value)">
      </div>
      <div class="flex justify-end mt-3">
        <button onclick="window.app.toggleShowAll()" class="text-[10px] font-black uppercase tracking-widest ${state.showAll ? 'text-blue-600' : 'text-gray-400'}">
          ${state.showAll ? 'Ver Apenas Próximos' : 'Ver Todos os Clientes'}
        </button>
      </div>
      ${renderClientList()}
    `;
  } else if (state.activeTab === 'finances') {
    const total = state.clients.reduce((acc, c) => acc + (c.totalPaidValue || 0), 0);
    container.innerHTML = `
      <div class="bg-green-600 p-8 rounded-[2.5rem] shadow-xl text-white animate-fade">
        <p class="text-green-100 text-[10px] font-black uppercase tracking-widest opacity-80">Faturamento Acumulado</p>
        <p class="text-4xl font-black mt-2">${formatCurrency(total)}</p>
      </div>
      <div class="mt-8 space-y-4">
        <h3 class="font-black text-gray-800 uppercase text-xs tracking-widest px-2">Histórico de Renovação</h3>
        ${state.clients.flatMap(c => (c.history || []).map(h => ({...h, name: c.name}))).sort((a,b) => new Date(b.date) - new Date(a.date)).map(h => `
          <div class="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
            <div>
              <p class="font-black text-xs text-gray-800">${h.name}</p>
              <p class="text-[9px] text-gray-400 uppercase font-bold">${formatDateBR(h.date)}</p>
            </div>
            <p class="font-black text-green-600 text-sm">${formatCurrency(h.value)}</p>
          </div>
        `).join('')}
      </div>
    `;
  } else if (state.activeTab === 'settings') {
    container.innerHTML = `
      <div class="space-y-6 animate-fade">
        <div class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 class="font-black text-gray-800 uppercase text-xs tracking-widest mb-4">Template de Mensagem (Próximo)</h3>
          <textarea id="tpl-upcoming" class="w-full bg-gray-50 p-4 rounded-2xl text-sm min-h-[100px] border-0" onchange="window.app.saveSettings('upcoming', this.value)">${state.settings.messageTemplateUpcoming}</textarea>
        </div>
        <div class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 class="font-black text-gray-800 uppercase text-xs tracking-widest mb-4">Template de Mensagem (Vencido)</h3>
          <textarea id="tpl-expired" class="w-full bg-gray-50 p-4 rounded-2xl text-sm min-h-[100px] border-0" onchange="window.app.saveSettings('expired', this.value)">${state.settings.messageTemplateExpired}</textarea>
        </div>
        <button onclick="window.app.exportData()" class="w-full bg-gray-100 text-gray-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest">Exportar Backup (JSON)</button>
      </div>
    `;
  }
};

// --- MODAIS E AÇÕES ---

const showModal = (content) => {
  const modal = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = content;
  modal.classList.remove('hidden');
};

const hideModal = () => {
  document.getElementById('modal-container').classList.add('hidden');
};

// --- API PÚBLICA (WINDOW.APP) ---

window.app = {
  setTab: (tab) => {
    state.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('bg-blue-600', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('shadow-lg', active);
      btn.classList.toggle('text-gray-400', !active);
    });
    renderApp();
  },
  search: (val) => {
    state.searchTerm = val;
    renderApp();
  },
  toggleShowAll: () => {
    state.showAll = !state.showAll;
    renderApp();
  },
  showAdd: () => {
    showModal(`
      <h2 class="text-2xl font-black mb-6 text-gray-800">Novo Cliente</h2>
      <form onsubmit="window.app.addClient(event)" class="space-y-4">
        <input type="text" name="name" placeholder="Nome do Cliente" class="w-full bg-gray-50 p-4 rounded-2xl font-bold" required>
        <input type="text" name="user" placeholder="Usuário/Login" class="w-full bg-gray-50 p-4 rounded-2xl font-bold">
        <input type="tel" name="whatsapp" placeholder="WhatsApp (DDD + Numero)" class="w-full bg-gray-50 p-4 rounded-2xl font-bold" required>
        <div class="grid grid-cols-2 gap-2">
          <input type="number" name="value" placeholder="Valor R$" class="bg-gray-50 p-4 rounded-2xl font-bold text-blue-600" required>
          <input type="date" name="startDate" value="${formatDateISO(new Date())}" class="bg-gray-50 p-4 rounded-2xl font-bold text-xs" required>
        </div>
        <div class="flex gap-2 pt-4">
          <button type="button" onclick="hideModal()" class="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-xs">Cancelar</button>
          <button type="submit" class="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase text-xs shadow-lg">Salvar</button>
        </div>
      </form>
    `);
  },
  addClient: (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const startDate = fd.get('startDate');
    const value = parseFloat(fd.get('value'));
    const expDate = formatDateISO(addMonths(parseDate(startDate), 1));
    
    const newClient = {
      id: Date.now().toString(),
      name: fd.get('name'),
      user: fd.get('user'),
      whatsapp: fd.get('whatsapp'),
      value: value,
      startDate: startDate,
      expirationDate: expDate,
      totalPaidValue: value,
      isActive: true,
      history: [{ date: startDate, value: value }]
    };
    
    state.clients.push(newClient);
    saveState();
    hideModal();
    renderApp();
  },
  showRenew: (id) => {
    const c = state.clients.find(x => x.id === id);
    showModal(`
      <h2 class="text-2xl font-black mb-2 text-gray-800">Renovar</h2>
      <p class="text-xs font-bold text-gray-400 uppercase mb-6">${c.name}</p>
      <form onsubmit="window.app.renewClient(event, '${id}')" class="space-y-4">
        <div>
          <label class="text-[10px] font-black text-gray-400 uppercase">Meses</label>
          <select name="months" class="w-full bg-gray-50 p-4 rounded-2xl font-bold">
            <option value="1">1 Mês</option>
            <option value="3">3 Meses</option>
            <option value="6">6 Meses</option>
            <option value="12">1 Ano</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-black text-gray-400 uppercase">Valor Recebido</label>
          <input type="number" name="value" value="${c.value}" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-green-600" required>
        </div>
        <div class="flex gap-2 pt-4">
          <button type="button" onclick="hideModal()" class="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-xs">Cancelar</button>
          <button type="submit" class="flex-1 bg-green-500 text-white font-black py-4 rounded-2xl uppercase text-xs shadow-lg">Confirmar</button>
        </div>
      </form>
    `);
  },
  renewClient: (e, id) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const months = parseInt(fd.get('months'));
    const value = parseFloat(fd.get('value'));
    const idx = state.clients.findIndex(x => x.id === id);
    const c = state.clients[idx];
    
    const baseDate = getDaysDiff(c.expirationDate) < 0 ? formatDateISO(new Date()) : c.expirationDate;
    const newExp = formatDateISO(addMonths(parseDate(baseDate), months));
    
    c.expirationDate = newExp;
    c.totalPaidValue = (c.totalPaidValue || 0) + value;
    c.isActive = true;
    c.history = c.history || [];
    c.history.push({ date: formatDateISO(new Date()), value: value });
    
    saveState();
    hideModal();
    renderApp();
  },
  whatsapp: (id) => {
    const c = state.clients.find(x => x.id === id);
    const status = getClientStatus(c);
    let template = (status === 'EXPIRED') ? state.settings.messageTemplateExpired : state.settings.messageTemplateUpcoming;
    
    const msg = template
      .replace(/{{nome}}/g, c.name)
      .replace(/{{vencimento}}/g, formatDateBR(c.expirationDate))
      .replace(/{{valor}}/g, formatCurrency(c.value))
      .replace(/{{usuario}}/g, c.user || 'N/D');
    
    c.lastMessageDate = new Date().toISOString();
    saveState();
    window.open(`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    renderApp();
  },
  toggleActive: (id) => {
    const c = state.clients.find(x => x.id === id);
    c.isActive = c.isActive === false;
    saveState();
    renderApp();
  },
  saveSettings: (key, val) => {
    if (key === 'upcoming') state.settings.messageTemplateUpcoming = val;
    if (key === 'expired') state.settings.messageTemplateExpired = val;
    saveState();
  },
  exportData: () => {
    const data = JSON.stringify({ clients: state.clients, settings: state.settings });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tv_manager_backup_${formatDateISO(new Date())}.json`;
    a.click();
  },
  showEdit: (id) => {
    const c = state.clients.find(x => x.id === id);
    showModal(`
      <h2 class="text-2xl font-black mb-6 text-gray-800">Editar Cliente</h2>
      <form onsubmit="window.app.updateClient(event, '${id}')" class="space-y-4">
        <input type="text" name="name" value="${c.name}" class="w-full bg-gray-50 p-4 rounded-2xl font-bold" required>
        <input type="text" name="user" value="${c.user || ''}" class="w-full bg-gray-50 p-4 rounded-2xl font-bold">
        <input type="tel" name="whatsapp" value="${c.whatsapp}" class="w-full bg-gray-50 p-4 rounded-2xl font-bold" required>
        <input type="number" name="value" value="${c.value}" class="w-full bg-gray-50 p-4 rounded-2xl font-bold text-blue-600" required>
        <div class="grid grid-cols-2 gap-2 pt-4">
          <button type="button" onclick="window.app.deleteClient('${id}')" class="bg-red-50 text-red-500 font-black py-4 rounded-2xl uppercase text-[10px]">Excluir</button>
          <button type="submit" class="bg-blue-600 text-white font-black py-4 rounded-2xl uppercase text-xs shadow-lg">Atualizar</button>
        </div>
        <button type="button" onclick="hideModal()" class="w-full bg-gray-100 text-gray-400 font-black py-4 rounded-2xl uppercase text-[10px]">Fechar</button>
      </form>
    `);
  },
  updateClient: (e, id) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const idx = state.clients.findIndex(x => x.id === id);
    state.clients[idx] = { ...state.clients[idx], name: fd.get('name'), user: fd.get('user'), whatsapp: fd.get('whatsapp'), value: parseFloat(fd.get('value')) };
    saveState();
    hideModal();
    renderApp();
  },
  deleteClient: (id) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      state.clients = state.clients.filter(x => x.id !== id);
      saveState();
      hideModal();
      renderApp();
    }
  }
};

// --- INICIALIZAÇÃO ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => window.app.setTab(btn.dataset.tab));
});

// Event listener global para fechar modal no clique fora
document.getElementById('modal-container').addEventListener('click', (e) => {
  if (e.target.id === 'modal-container') hideModal();
});

renderApp();
