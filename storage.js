// ===== ХРАНИЛИЩЕ ЧЕРЕЗ GITHUB API (публичный репозиторий) =====
// Настройки – укажите свои
const GITHUB_OWNER = 'SaMbananchik';      // например 'ivanov'
const GITHUB_REPO = 'minecraftDeniks'; // например 'minecraft-economy'
const FILE_PATH = 'info.json';

let GITHUB_TOKEN = localStorage.getItem('github_token') || '';

// Получение SHA файла (нужен для обновления)
async function getCurrentFileSha() {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const headers = GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {};
    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Ошибка получения SHA');
    const data = await res.json();
    return data.sha;
}

// Загрузка данных (без токена – для публичных репозиториев)
async function loadFromCloud() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
        const res = await fetch(url);
        if (res.status === 404) return { players: [], rulesTabs: [] };
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        const content = atob(data.content);
        return JSON.parse(content);
    } catch (e) {
        console.error(e);
        return { players: [], rulesTabs: [] };
    }
}

// Сохранение данных (требует токен)
async function saveToCloudFull(data) {
    if (!GITHUB_TOKEN) {
        const token = prompt(
            'Для сохранения данных нужен GitHub Personal Access Token.\n\n' +
            'Как получить:\n' +
            '1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)\n' +
            '2. Generate new token (classic)\n' +
            '3. Название: MinecraftEconomy, срок: No expiration\n' +
            '4. Поставьте галочку repo\n' +
            '5. Generate token\n' +
            '6. Скопируйте токен и вставьте сюда'
        );
        if (token) {
            GITHUB_TOKEN = token;
            localStorage.setItem('github_token', token);
        } else {
            alert('Без токена сохранение невозможно');
            return false;
        }
    }
    try {
        const sha = await getCurrentFileSha();
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const body = {
            message: 'Update economy data',
            content: content,
            sha: sha || undefined
        };
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Ошибка сохранения');
        return true;
    } catch (e) {
        console.error(e);
        alert('Ошибка сохранения: ' + e.message);
        return false;
    }
}

async function initStorage() {
    // Для публичного репозитория просто проверяем доступ
    return true;
}

function updateCloudStatus(status, message) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (!dot) return;
    dot.className = 'status-dot';
    if (status === 'online') dot.classList.add('online');
    else if (status === 'offline') dot.classList.add('offline');
    else if (status === 'syncing') dot.classList.add('syncing');
    if (text) text.textContent = message || (status === 'online' ? 'GitHub: онлайн' : '');
}