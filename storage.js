const REPO_OWNER = 'SaMbananchik';
const REPO_NAME = 'minecraftDeniks';
const FILE_PATH = 'info.json';
let GITHUB_TOKEN = localStorage.getItem('github_token') || '';

async function loadFromCloud() {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const res = await fetch(url);
    if (res.status === 404) return { players: [], rulesTabs: [] };
    const data = await res.json();
    const content = atob(data.content);
    return JSON.parse(content);
}

async function saveToCloudFull(data) {
    if (!GITHUB_TOKEN) {
        const token = prompt('Введите GitHub токен (права repo)');
        if (token) GITHUB_TOKEN = token;
        else return false;
        localStorage.setItem('github_token', GITHUB_TOKEN);
    }
    // получение sha
    const urlGet = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    let sha = null;
    const getRes = await fetch(urlGet, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
    if (getRes.ok) sha = (await getRes.json()).sha;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const body = { message: 'Update', content, sha: sha || undefined };
    const putRes = await fetch(urlGet, {
        method: 'PUT',
        headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return putRes.ok;
}