let players = [];
let rulesTabs = [];
let currentEditNick = null;
let currentDiamondPlayer = null;
let currentEditTabIndex = null;

let accessLevel = 'view';
let accessMessage = 'Режим просмотра';

// Пароли: DonaldCapcap — полный доступ, QwertyTrump — только игроки (без алмазов)
const PASSWORDS = {
    'DonaldCapcap': { level: 'admin', allowDiamonds: true, allowFull: true },
    'QwertyTrump': { level: 'user', allowDiamonds: false, allowFull: false }
};

const ESTATE_LIST = ['Крестьянин', 'Горожанин', 'Элит Горожанин', 'Дворянин', 'Высшая власть'];

let appData = { players: [], rulesTabs: [] };

// ===== ФУНКЦИИ ВХОДА =====
function checkPassword(password) {
    const entry = PASSWORDS[password];
    if (!entry) return { success: false, level: 'view' };
    return { success: true, level: entry.level, allowDiamonds: entry.allowDiamonds };
}

function setAccess(level, allowDiamonds = false) {
    accessLevel = level;
    if (level === 'admin') accessMessage = 'Полный доступ (админ)';
    else if (level === 'user') accessMessage = 'Доступ к игрокам (без алмазов)';
    else accessMessage = 'Режим просмотра';
    const badge = document.getElementById('accessBadge');
    badge.textContent = `🔐 ${accessMessage}`;
    badge.className = `access-badge ${level}`;
    applyAccessRestrictions();
}

function applyAccessRestrictions() {
    const isAdmin = accessLevel === 'admin';
    const isUser = accessLevel === 'user';
    const canEditPlayers = isAdmin || isUser;
    const createBtn = document.getElementById('createBtn');
    if (createBtn) createBtn.style.display = canEditPlayers ? 'block' : 'none';
    const toolsDiv = document.getElementById('rulesEditTools');
    if (toolsDiv) toolsDiv.style.display = isUser ? 'flex' : 'none';
    renderTable();
}

function login(password) {
    const result = checkPassword(password);
    if (result.success) {
        setAccess(result.level, result.allowDiamonds);
        showToast(`Вход выполнен. Режим: ${accessMessage}`, 'success');
    } else {
        setAccess('view');
        showToast('Неверный пароль. Режим просмотра.', 'error');
    }
}

document.getElementById('loginBtnWidget').onclick = () => {
    const pwd = document.getElementById('passwordInputWidget').value;
    login(pwd);
};
document.getElementById('passwordInputWidget').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login(e.target.value);
});

// ===== ЗАГРУЗКА ДАННЫХ =====
async function init() {
    await initStorage();
    await refreshData();
    setupEventListeners();
    setupTabs();
    setAccess('view');
}

window.refreshData = async function() {
    try {
        const cloudData = await loadFromCloud();
        appData = {
            players: cloudData.players || [],
            rulesTabs: cloudData.rulesTabs || []
        };
        players = appData.players;
        rulesTabs = appData.rulesTabs;
        if (!players.length) {
            players = [
                { nickname: "sasha13131", estate: "Высшая власть", diamonds: 10000, licenses: ["Шахтёрская", "Строительная"] },
                { nickname: "dimon2009", estate: "Дворянин", diamonds: 5000, licenses: ["Торговая"] }
            ];
            appData.players = players;
            await saveToCloud();
        }
        if (!rulesTabs.length) {
            rulesTabs = [
                { name: "Общие правила", content: "Добро пожаловать!\n\n[red]Запрещено[/red] гриферить.\n**Уважайте** других." },
                { name: "Экономика", content: "Валюта – алмазы.\n[gold]Торгуйте[/gold]." }
            ];
            appData.rulesTabs = rulesTabs;
            await saveToCloud();
        }
        renderTable();
        updateStats();
        renderRulesTabs();
        showToast('Данные загружены', 'success');
    } catch (error) {
        showToast('Ошибка загрузки', 'error');
    }
};

async function saveToCloud() {
    try {
        appData.players = players;
        appData.rulesTabs = rulesTabs;
        await saveToCloudFull(appData);
        showToast('Сохранено в облако', 'success');
    } catch (error) {
        showToast('Ошибка сохранения', 'error');
    }
}

// ===== УПРАВЛЕНИЕ ИГРОКАМИ =====
function requireAuth(actionCallback, requiredLevel = 'any', allowDiamonds = false) {
    if (accessLevel === 'admin') { actionCallback(); return; }
    if (accessLevel === 'user' && requiredLevel !== 'admin') {
        if (!allowDiamonds) { actionCallback(); return; }
        else { showToast('Недостаточно прав для изменения алмазов', 'error'); return; }
    }
    showToast('Требуется вход с соответствующими правами', 'error');
}

function openCreateModal() { requireAuth(() => openCreateModalInternal(), 'user'); }
function openEditModal(nick) { requireAuth(() => openEditModalInternal(nick), 'user'); }
function deletePlayer(nick) { requireAuth(() => deletePlayerInternal(nick), 'user'); }
function openDiamondModal(nick) { requireAuth(() => openDiamondModalInternal(nick), 'admin', true); }

function openCreateModalInternal() {
    currentEditNick = null;
    document.getElementById('modalTitle').innerText = '➕ Создать игрока';
    document.getElementById('playerNick').value = '';
    document.getElementById('playerNick').disabled = false;
    document.getElementById('playerEstate').value = 'Крестьянин';
    document.getElementById('playerDiamonds').value = 0;
    document.getElementById('playerLicenses').value = '';
    document.getElementById('saveBtn').onclick = () => savePlayer();
    document.getElementById('playerModal').classList.add('active');
}
function openEditModalInternal(nickname) {
    const player = players.find(p => p.nickname === nickname);
    if (!player) return;
    currentEditNick = nickname;
    document.getElementById('modalTitle').innerText = '✏️ Редактировать игрока';
    document.getElementById('playerNick').value = player.nickname;
    document.getElementById('playerNick').disabled = true;
    document.getElementById('playerEstate').value = player.estate;
    document.getElementById('playerDiamonds').value = player.diamonds;
    document.getElementById('playerLicenses').value = player.licenses.join(' ');
    document.getElementById('saveBtn').onclick = () => updatePlayer();
    document.getElementById('playerModal').classList.add('active');
}
function savePlayer() {
    const nickname = document.getElementById('playerNick').value.trim();
    if (!nickname) { showToast('Введите ник', 'error'); return; }
    if (players.find(p => p.nickname === nickname)) { showToast('Ник занят', 'error'); return; }
    players.push({
        nickname,
        estate: document.getElementById('playerEstate').value,
        diamonds: parseInt(document.getElementById('playerDiamonds').value) || 0,
        licenses: document.getElementById('playerLicenses').value.split(/\s+/).filter(l => l)
    });
    saveToCloud();
    renderTable();
    updateStats();
    closeModal();
    showToast(`Игрок ${nickname} создан`, 'success');
}
function updatePlayer() {
    const nickname = currentEditNick;
    const index = players.findIndex(p => p.nickname === nickname);
    if (index !== -1) {
        players[index] = {
            nickname,
            estate: document.getElementById('playerEstate').value,
            diamonds: parseInt(document.getElementById('playerDiamonds').value) || 0,
            licenses: document.getElementById('playerLicenses').value.split(/\s+/).filter(l => l)
        };
        saveToCloud();
        renderTable();
        updateStats();
        closeModal();
        showToast(`Игрок ${nickname} обновлён`, 'success');
    }
}
function deletePlayerInternal(nickname) {
    players = players.filter(p => p.nickname !== nickname);
    saveToCloud();
    renderTable();
    updateStats();
    showToast(`Игрок ${nickname} удалён`, 'success');
}
function openDiamondModalInternal(nickname) {
    currentDiamondPlayer = nickname;
    const player = players.find(p => p.nickname === nickname);
    if (!player) return;
    document.getElementById('diamondPlayerName').innerText = nickname;
    document.getElementById('addDiamonds').value = 0;
    document.getElementById('removeDiamonds').value = 0;
    document.getElementById('setDiamonds').value = player.diamonds;
    document.getElementById('diamondModal').classList.add('active');
}
function addDiamonds() {
    const amount = parseInt(document.getElementById('addDiamonds').value) || 0;
    if (amount <= 0) return;
    const player = players.find(p => p.nickname === currentDiamondPlayer);
    if (player) { player.diamonds += amount; saveToCloud(); renderTable(); updateStats(); closeDiamondModal(); showToast(`Добавлено ${amount} алмазов`, 'success'); }
}
function removeDiamonds() {
    const amount = parseInt(document.getElementById('removeDiamonds').value) || 0;
    if (amount <= 0) return;
    const player = players.find(p => p.nickname === currentDiamondPlayer);
    if (player) { player.diamonds = Math.max(0, player.diamonds - amount); saveToCloud(); renderTable(); updateStats(); closeDiamondModal(); showToast(`Убрано ${amount} алмазов`, 'success'); }
}
function setDiamonds() {
    const amount = parseInt(document.getElementById('setDiamonds').value) || 0;
    if (amount < 0) return;
    const player = players.find(p => p.nickname === currentDiamondPlayer);
    if (player) { player.diamonds = amount; saveToCloud(); renderTable(); updateStats(); closeDiamondModal(); showToast(`Алмазы установлены: ${amount}`, 'success'); }
}
function closeModal() { document.getElementById('playerModal').classList.remove('active'); }
function closeDiamondModal() { document.getElementById('diamondModal').classList.remove('active'); }

// ===== РЕНДЕР ТАБЛИЦЫ =====
function renderTable() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const estateFilter = document.getElementById('estateFilter')?.value || 'all';
    const sortBy = document.getElementById('sortSelect')?.value || 'name';
    let filtered = players.filter(p => p.nickname.toLowerCase().includes(search) && (estateFilter === 'all' || p.estate === estateFilter));
    const getIndex = e => ESTATE_LIST.indexOf(e);
    filtered.sort((a,b) => {
        if (sortBy === 'name') return a.nickname.localeCompare(b.nickname);
        if (sortBy === 'name-desc') return b.nickname.localeCompare(a.nickname);
        if (sortBy === 'diamonds') return b.diamonds - a.diamonds;
        if (sortBy === 'diamonds-asc') return a.diamonds - b.diamonds;
        if (sortBy === 'estate') return getIndex(b.estate) - getIndex(a.estate);
        return 0;
    });
    const tbody = document.getElementById('tableBody');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="6" class="loading">Нет игроков</td></tr>'; return; }
    const canEdit = (accessLevel === 'admin' || accessLevel === 'user');
    tbody.innerHTML = filtered.map((p,i) => `
        <tr>
            <td>${i+1}</td>
            <td><strong>${escapeHtml(p.nickname)}</strong></td>
            <td><span class="estate estate-${getIndex(p.estate)}">${p.estate}</span></td>
            <td class="diamonds">${p.diamonds} 💎</td>
            <td>${p.licenses.map(l => `<span class="license">📜 ${escapeHtml(l)}</span>`).join('') || '❌'}</td>
            <td class="action-buttons">
                ${canEdit ? `<button class="action-btn action-edit" onclick="openEditModal('${escapeHtml(p.nickname)}')">✏️</button>` : ''}
                ${accessLevel === 'admin' ? `<button class="action-btn action-diamond" onclick="openDiamondModal('${escapeHtml(p.nickname)}')">💎</button>` : ''}
                ${canEdit ? `<button class="action-btn action-delete" onclick="deletePlayer('${escapeHtml(p.nickname)}')">🗑️</button>` : ''}
            </td>
        </tr>
    `).join('');
}
function updateStats() {
    document.getElementById('totalPlayers').innerText = players.length;
    const totalD = players.reduce((s,p)=>s+p.diamonds,0);
    document.getElementById('totalDiamonds').innerText = totalD;
    if (players.length) {
        const richest = players.reduce((max,p)=>p.diamonds>max.diamonds?p:max, players[0]);
        document.getElementById('richestPlayer').innerText = `${richest.nickname} (${richest.diamonds}💎)`;
    } else { document.getElementById('richestPlayer').innerText = '-'; }
}

// ===== ВКЛАДКИ ПРАВИЛ =====
function renderRulesTabs() {
    const container = document.getElementById('rulesTabsContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!rulesTabs.length) rulesTabs = [{ name: "Правила", content: "Нет данных" }];
    rulesTabs.forEach((tab, idx) => {
        const btn = document.createElement('button');
        btn.className = 'rule-tab';
        if (idx === 0) btn.classList.add('active');
        btn.innerHTML = `${escapeHtml(tab.name)} ${accessLevel === 'user' ? `<span class="delete-tab" data-idx="${idx}">🗑️</span>` : ''}`;
        btn.onclick = (e) => {
            if (e.target.classList.contains('delete-tab')) return;
            document.querySelectorAll('.rule-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showRuleContent(idx);
        };
        container.appendChild(btn);
        if (accessLevel === 'user') {
            const delSpan = btn.querySelector('.delete-tab');
            if (delSpan) delSpan.onclick = (e) => { e.stopPropagation(); deleteRuleTab(idx); };
        }
    });
    if (rulesTabs.length) showRuleContent(0);
}
function showRuleContent(index) {
    const contentArea = document.getElementById('rulesContentArea');
    const tab = rulesTabs[index];
    if (!tab) return;
    let html = `<div class="rules-editor"><div class="rules-header-editor">`;
    if (accessLevel === 'user') {
        html += `<button class="btn-sm edit-tab-btn" data-idx="${index}">✏️ Редактировать вкладку</button>`;
    }
    html += `</div><div class="rules-preview">${convertMarkupToHtml(tab.content)}</div></div>`;
    contentArea.innerHTML = html;
    if (accessLevel === 'user') {
        const editBtn = contentArea.querySelector('.edit-tab-btn');
        if (editBtn) editBtn.onclick = () => openEditTabModal(index);
    }
}
function convertMarkupToHtml(text) {
    let html = text.replace(/\[(red|green|gold|cyan|white)\](.*?)\[\/\1\]/gs, (match, color, content) => `<span class="color-${color}">${content}</span>`);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
}
function openEditTabModal(index) {
    currentEditTabIndex = index;
    const tab = rulesTabs[index];
    document.getElementById('editTabName').value = tab.name;
    document.getElementById('editTabContent').value = tab.content;
    document.getElementById('editRuleTabModal').classList.add('active');
    document.getElementById('saveTabBtn').onclick = () => saveEditedTab();
}
function saveEditedTab() {
    const newName = document.getElementById('editTabName').value.trim();
    const newContent = document.getElementById('editTabContent').value;
    if (newName && currentEditTabIndex !== null) {
        rulesTabs[currentEditTabIndex] = { name: newName, content: newContent };
        saveToCloud();
        renderRulesTabs();
        closeEditTabModal();
        showToast('Вкладка обновлена', 'success');
    }
}
function deleteRuleTab(index) {
    if (rulesTabs.length <= 1) { showToast('Нельзя удалить последнюю вкладку', 'error'); return; }
    rulesTabs.splice(index, 1);
    saveToCloud();
    renderRulesTabs();
    showToast('Вкладка удалена', 'success');
}
function addRuleTab() {
    const newName = `Новая вкладка ${rulesTabs.length + 1}`;
    rulesTabs.push({ name: newName, content: "Содержимое новой вкладки..." });
    saveToCloud();
    renderRulesTabs();
    showToast('Вкладка добавлена', 'success');
}
function closeEditTabModal() {
    document.getElementById('editRuleTabModal').classList.remove('active');
    currentEditTabIndex = null;
}

function escapeHtml(str) { return str?.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])) || ''; }
function showToast(msg, type='success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + (type === 'error' ? 'error' : '');
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}
function setupEventListeners() {
    document.getElementById('searchInput')?.addEventListener('input', renderTable);
    document.getElementById('estateFilter')?.addEventListener('change', renderTable);
    document.getElementById('sortSelect')?.addEventListener('change', renderTable);
    document.getElementById('createBtn')?.addEventListener('click', openCreateModal);
    const syncBtn = document.getElementById('manualSyncBtn');
    if (syncBtn) syncBtn.onclick = () => refreshData();
    document.getElementById('addRuleTabBtn')?.addEventListener('click', addRuleTab);
}
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`${tabId}Tab`).classList.add('active');
            if (tabId === 'rules') renderRulesTabs();
        });
    });
}
init();