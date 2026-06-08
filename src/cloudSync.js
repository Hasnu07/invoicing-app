const MANTLE_BASE = 'https://mantledb.sh/v2';
const MAX_CHUNK = 50000;

export function getWorkspaceFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return { workspace: p.get('w') || '', key: p.get('k') || '' };
}

export function setWorkspaceInUrl(workspace, key) {
  const url = new URL(window.location.href);
  url.searchParams.set('w', workspace);
  url.searchParams.set('k', key);
  window.history.replaceState({}, '', url.toString());
}

export function buildSyncLink(workspace, key) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('w', workspace);
  url.searchParams.set('k', key);
  return url.toString();
}

export function newWorkspaceId() {
  return 'inv' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function claimWorkspace(workspaceId) {
  const r = await fetch(`${MANTLE_BASE}/claim/${encodeURIComponent(workspaceId)}`);
  if (!r.ok) throw new Error('Could not create cloud workspace');
  const data = await r.json();
  return { workspace: data.namespace, key: data.key };
}

async function mantleRequest(method, workspace, key, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Mantle-Key': key },
  };
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  const r = await fetch(`${MANTLE_BASE}/${encodeURIComponent(workspace)}/${path}`, opts);
  if (method === 'GET' && r.status === 404) return null;
  if (!r.ok) {
    const msg = r.status === 413 ? 'Data too large for cloud storage (64 KB per chunk on free tier)' : `Cloud sync failed (${r.status})`;
    throw new Error(msg);
  }
  if (method === 'GET') return r.json();
  return true;
}

export async function saveToCloud(workspace, key, jsonString) {
  const chunks = [];
  for (let i = 0; i < jsonString.length; i += MAX_CHUNK) chunks.push(jsonString.slice(i, i + MAX_CHUNK));
  const updatedAt = Date.now();
  await mantleRequest('POST', workspace, key, 'data/manifest', { chunks: chunks.length, updatedAt });
  for (let i = 0; i < chunks.length; i++) {
    await mantleRequest('POST', workspace, key, `data/chunk/${i}`, { data: chunks[i] });
  }
  return updatedAt;
}

export async function loadFromCloud(workspace, key) {
  const manifest = await mantleRequest('GET', workspace, key, 'data/manifest');
  if (!manifest || !manifest.chunks) return null;
  let str = '';
  for (let i = 0; i < manifest.chunks; i++) {
    const chunk = await mantleRequest('GET', workspace, key, `data/chunk/${i}`);
    if (!chunk || chunk.data == null) return null;
    str += chunk.data;
  }
  return { json: str, updatedAt: manifest.updatedAt || 0 };
}
