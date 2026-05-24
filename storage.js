// ===== ХРАНИЛИЩЕ ЧЕРЕЗ GITHUB GIST =====
// Настройки (укажите свой логин)
const GITHUB_USERNAME = 'ВАШ_ЛОГИН';  // например 'ivanov'
let GIST_ID = localStorage.getItem('minecraft_gist_id');
let GITHUB_TOKEN = localStorage.getItem('github_token') || '';

// Создание нового gist (только при первом сохранении)
async function createGist(data) {
    const url = 'https://api.github.com/gists';
    const body = {
        description: 'Minecraft Economy Data',
        public: true,  // публичный – друзья смогут читать без токена
        files: {
            'info.json': { content: JSON.stringify(data, null, 2) }
        }
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Ошибка создания gist');
    const json = await res.json();
    GIST_ID = json.id;
    localStorage.setItem('minecraft_gist_id', GIST_ID);
    return GIST_ID;
}

// Загрузка данных из gist (не требует токена, если gist публичный)
async function loadFromCloud() {
    if (!GIST_ID) return { players: [], rulesTabs: [] };
    try {
        const url = `https://api.github.com/gists/${GIST_ID}`;
        const res = await fetch(url);
        if (res.status === 404) return { players: [], rulesTabs: [] };
        if (!res.ok) throw new Error('Ошибка загрузки gist');
        const data = await res.json();
        const content = data.files['info.json']?.content;
        if (!content) return { players: [], rulesTabs: [] };
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
            'Для сохранения нужен GitHub Personal Access Token.\n\n' +
            'Как получить:\n' +
            '1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)\n' +
            '2. Generate new token (classic)\n' +
            '3. Название: MinecraftEconomy, срок: No expiration\n' +
            '4. Поставьте галочку gist (это важно!)\n' +
            '5. Generate token → скопируйте'
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
        if (!GIST_ID) {
            // Создаём новый gist
            await createGist(data);
        } else {
            // Обновляем существующий gist
            const url = `https://api.github.com/gists/${GIST_ID}`;
            const body = {
                files: {
                    'info.json': { content: JSON.stringify(data, null, 2) }
                }
            };
            const res = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('Ошибка обновления gist');
        }
        return true;
    } catch (e) {
        console.error(e);
        alert('Ошибка сохранения: ' + e.message);
        return false;
    }
}

async function initStorage() {
    // Просто проверяем, есть ли уже gist (не требуется токен)
    try {
        if (GIST_ID) {
            await loadFromCloud(); // тест чтения
        }
        updateCloudStatus('online', 'Gist готов');
    } catch(e) {
        updateCloudStatus('offline', 'Ошибка доступа к gist');
    }
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
    if (text) text.textContent = message || (status === 'online' ? 'Gist: онлайн' : '');
}