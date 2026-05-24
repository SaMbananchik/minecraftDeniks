// ===== ХРАНИЛИЩЕ НА JSONBOX.IO (автосоздание бокса) =====
let currentBoxUrl = null;

async function initStorage() {
    let boxId = localStorage.getItem('minecraft_box_id');
    if (!boxId) {
        const createRes = await fetch('https://jsonbox.io/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _created: Date.now() })
        });
        const data = await createRes.json();
        boxId = data._id;
        localStorage.setItem('minecraft_box_id', boxId);
    }
    currentBoxUrl = `https://jsonbox.io/${boxId}`;
    const test = await fetch(currentBoxUrl);
    if (test.status === 404) {
        await fetch(currentBoxUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _created: Date.now() })
        });
    }
    updateCloudStatus('online', 'Облако готово');
    return true;
}

async function loadFromCloud() {
    if (!currentBoxUrl) await initStorage();
    updateCloudStatus('syncing', 'Загрузка...');
    const response = await fetch(currentBoxUrl);
    if (response.status === 404) return { players: [], rulesTabs: [] };
    let data = await response.json();
    if (Array.isArray(data)) {
        const players = data.map(({ _id, _createdOn, ...p }) => p);
        return { players, rulesTabs: [] };
    }
    if (data && typeof data === 'object') {
        const { _id, _createdOn, ...clean } = data;
        if (!clean.rulesTabs) clean.rulesTabs = [
            { name: "Общие правила", content: "Приветствуем!\n\n[red]Запрещено[/red] гриферить.\n**Уважайте** других." },
            { name: "Экономика", content: "Валюта – алмазы.\n[gold]Торгуйте[/gold]." }
        ];
        return clean;
    }
    return { players: [], rulesTabs: [] };
}

async function saveToCloudFull(data) {
    if (!currentBoxUrl) await initStorage();
    updateCloudStatus('syncing', 'Сохранение...');
    await fetch(currentBoxUrl, { method: 'DELETE' });
    const response = await fetch(currentBoxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Save failed');
    updateCloudStatus('online', 'Сохранено');
}

function updateCloudStatus(status, message) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (!dot) return;
    dot.className = 'status-dot';
    if (status === 'online') dot.classList.add('online');
    else if (status === 'offline') dot.classList.add('offline');
    else if (status === 'syncing') dot.classList.add('syncing');
    if (text) text.textContent = message || (status === 'online' ? 'Облако: онлайн' : '');
}