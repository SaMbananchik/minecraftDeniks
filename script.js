let players = [];
let editNick = null;
let accessLevel = 'none'; // 'none', 'admin', 'super'

const order = { 'Младший Крестьянин': 0, 'Крестьянин': 1, 'Средний класс': 2, 'Дворянин': 3, 'Высшая власть': 4 };

const PASS_ADMIN = 'AdminProverka';
const PASS_SUPER = 'capcap3333';

function checkPassword() {
    const pw = document.getElementById('passwordInput').value;
    if (pw === PASS_SUPER) {
        accessLevel = 'super';
        toast('Полный доступ активирован');
    } else if (pw === PASS_ADMIN) {
        accessLevel = 'admin';
        toast('Доступ активирован (без алмазов)');
    } else {
        accessLevel = 'none';
        if (pw) toast('Неверный пароль', 'error');
    }
    document.getElementById('passwordInput').value = '';
    updateAccessUI();
    render();
}

function updateAccessUI() {
    const statusEl = document.getElementById('accessStatus');
    const createBtn = document.getElementById('createBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    if (accessLevel === 'super') {
        statusEl.textContent = '🟢 Полный доступ';
        statusEl.className = 'access-status access-super';
        createBtn.style.display = '';
        refreshBtn.style.display = '';
    } else if (accessLevel === 'admin') {
        statusEl.textContent = '🟡 Доступ без алмазов';
        statusEl.className = 'access-status access-admin';
        createBtn.style.display = '';
        refreshBtn.style.display = '';
    } else {
        statusEl.textContent = '🔴 Только просмотр';
        statusEl.className = 'access-status access-none';
        createBtn.style.display = 'none';
        refreshBtn.style.display = 'none';
    }
}

async function loadPlayers() {
    try {
        const res = await fetch('/api/players');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        players = await res.json();
        document.getElementById('cloudStatus').innerText = '🟢 База данных: Подключено (Синхронизация Live)';
        render();
        updateStats();
    } catch (error) {
        document.getElementById('cloudStatus').innerText = '🔴 Ошибка подключения к базе данных';
        console.error(error);
    }
}

loadPlayers();
setInterval(loadPlayers, 5000);
updateAccessUI();

function render() {
    const search = document.getElementById('search').value.toLowerCase();
    const estateF = document.getElementById('estateFilter').value;
    const sort = document.getElementById('sortBy').value;

    let filtered = players.filter(p =>
        p.nickname.toLowerCase().includes(search) &&
        (estateF === 'all' || p.estate === estateF)
    );

    filtered.sort((a, b) => {
        if (sort === 'name') return a.nickname.localeCompare(b.nickname);
        if (sort === 'name-desc') return b.nickname.localeCompare(a.nickname);
        if (sort === 'diamonds') return b.diamonds - a.diamonds;
        if (sort === 'diamonds-asc') return a.diamonds - b.diamonds;
        if (sort === 'estate') return order[b.estate] - order[a.estate];
        return 0;
    });

    const tbody = document.getElementById('tableBody');
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Игроки не найдены</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${p.nickname}</strong></td>
            <td><span class="estate estate-${order[p.estate]}">${p.estate}</span></td>
            <td class="diamonds">${p.diamonds} 💎</td>
            <td>${(p.licenses || []).map(l => `<span class="license">📜 ${l}</span>`).join('') || '❌ нет'}</td>
            <td class="actions">
                ${accessLevel !== 'none' ? `
                <button class="edit-btn" onclick="openEdit('${p.nickname}')">✏️</button>
                <button class="delete-btn" onclick="deletePlayer('${p.nickname}')">🗑️</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    document.getElementById('totalPlayers').innerText = players.length;
    const total = players.reduce((s, p) => s + p.diamonds, 0);
    document.getElementById('totalDiamonds').innerText = total;

    if (players.length) {
        const richest = players.reduce((max, p) => p.diamonds > max.diamonds ? p : max, players[0]);
        document.getElementById('richestPlayer').innerText = `${richest.nickname} (${richest.diamonds}💎)`;
    } else {
        document.getElementById('richestPlayer').innerText = '-';
    }
}

document.getElementById('btnDecreaseDim').onclick = () => {
    const current = parseInt(document.getElementById('diamonds').value) || 0;
    const change = parseInt(document.getElementById('dimChangeAmount').value) || 0;
    document.getElementById('diamonds').value = Math.max(0, current - change);
};

document.getElementById('btnIncreaseDim').onclick = () => {
    const current = parseInt(document.getElementById('diamonds').value) || 0;
    const change = parseInt(document.getElementById('dimChangeAmount').value) || 0;
    document.getElementById('diamonds').value = current + change;
};

async function savePlayer() {
    if (accessLevel === 'none') return toast('Нет доступа', 'error');

    const nickInput = document.getElementById('nick').value.trim();
    const estateInput = document.getElementById('estate').value;
    const licensesInput = document.getElementById('licenses').value.split(/\s+/).filter(l => l);

    let diamondsInput;
    if (accessLevel === 'super') {
        diamondsInput = parseInt(document.getElementById('diamonds').value) || 0;
    } else if (editNick !== null) {
        const original = players.find(p => p.nickname === editNick);
        diamondsInput = original ? original.diamonds : 0;
    } else {
        diamondsInput = 0;
    }

    if (!nickInput) return toast('Введите ник', 'error');

    try {
        if (editNick === null) {
            const exists = players.some(p => p.nickname.toLowerCase() === nickInput.toLowerCase());
            if (exists) return toast('Игрок уже существует', 'error');

            const res = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: nickInput, estate: estateInput, diamonds: diamondsInput, licenses: licensesInput })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Ошибка создания');
            }
            toast('Игрок успешно добавлен!');
        } else {
            const res = await fetch('/api/players', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: editNick, estate: estateInput, diamonds: diamondsInput, licenses: licensesInput })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Ошибка обновления');
            }
            toast('Баланс обновлен!');
        }

        closeModal();
        await loadPlayers();
    } catch (e) {
        toast(e.message, 'error');
        console.error(e);
    }
}

window.deletePlayer = async function(nick) {
    if (accessLevel === 'none') return toast('Нет доступа', 'error');
    if (!confirm(`Удалить игрока ${nick}?`)) return;
    try {
        const res = await fetch('/api/players', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: nick })
        });
        if (!res.ok) throw new Error('Ошибка удаления');
        toast('Игрок удален');
        await loadPlayers();
    } catch (e) {
        toast(e.message, 'error');
        console.error(e);
    }
};

window.openEdit = function(nick) {
    if (accessLevel === 'none') return;
    const p = players.find(x => x.nickname === nick);
    if (!p) return;

    const canEditDiamonds = accessLevel === 'super';

    editNick = nick;
    document.getElementById('modalTitle').innerText = '✏️ Изменить баланс алмазов';
    document.getElementById('nick').value = p.nickname;
    document.getElementById('nick').disabled = true;
    document.getElementById('estate').value = p.estate;
    document.getElementById('diamonds').value = p.diamonds;
    document.getElementById('diamonds').disabled = !canEditDiamonds;
    document.getElementById('licenses').value = (p.licenses || []).join(' ');

    document.getElementById('diamondsActionBlock').style.display = canEditDiamonds ? 'flex' : 'none';
    document.getElementById('modal').style.display = 'flex';
};

function openCreate() {
    if (accessLevel === 'none') return;
    editNick = null;
    document.getElementById('modalTitle').innerText = '➕ Зарегистрировать игрока';
    document.getElementById('nick').value = '';
    document.getElementById('nick').disabled = false;
    document.getElementById('estate').value = 'Крестьянин';
    document.getElementById('diamonds').value = 0;
    document.getElementById('diamonds').disabled = accessLevel !== 'super';
    document.getElementById('licenses').value = '';

    document.getElementById('diamondsActionBlock').style.display = 'none';
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

function toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2500);
}

document.getElementById('createBtn').onclick = openCreate;
document.getElementById('refreshBtn').onclick = async () => {
    if (confirm('Сбросить базу данных к первоначальным двум игрокам? Это сотрёт данные у всех пользователей.')) {
        try {
            const res = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset' })
            });
            if (!res.ok) throw new Error('Ошибка сброса');
            players = await res.json();
            render();
            updateStats();
            toast('База данных сброшена к начальной');
        } catch (e) {
            toast(e.message, 'error');
        }
    }
};
document.getElementById('closeModalBtn').onclick = closeModal;
document.getElementById('cancelModalBtn').onclick = closeModal;
document.getElementById('saveBtn').onclick = savePlayer;

document.getElementById('search').oninput = render;
document.getElementById('estateFilter').onchange = render;
document.getElementById('sortBy').onchange = render;

document.getElementById('loginBtn').onclick = checkPassword;
document.getElementById('passwordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
});
