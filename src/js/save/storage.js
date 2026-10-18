// ---------------------------------------------------------------------------
// save/storage.js — where worlds live.
//
// Layers:
//   1. Local: IndexedDB in this browser (falls back to localStorage, then to
//      memory with a warning). Fast, works offline and in the downloaded file.
//   2. Cloud: when the game runs inside Claude and the viewer is signed in,
//      every save is mirrored to the viewer's private cloud storage, so worlds
//      follow them across devices and survive cleared browser data.
//   3. Export/Import: a world can always be downloaded as a single .json file
//      and loaded back in — the last line of defence.
//
// Every record carries a format number. When the format changes, add a step
// to migrateWorldRecord / migrateChunkRecord — old saves are upgraded on load,
// never discarded.
// ---------------------------------------------------------------------------

const SAVE_FORMAT = 1;
const GAME_VERSION = '0.1.0-alpha.2';
// 0.9.0.40: the GitHub repository (owner/name) whose releases the desktop launcher updates from.
// The launcher reads it out of whichever game file it runs, so a game update can switch updates on.
const UPDATE_SOURCE = 'FartGarfunkel/The-Shadowbloom-of-Eldenwood';

function migrateWorldRecord(rec) {
  if (!rec) return rec;
  if (!rec.format) rec.format = 1;
  // Future: if (rec.format < 2) { ...upgrade...; rec.format = 2; }
  rec.meta = rec.meta || {};
  rec.meta.flags = rec.meta.flags || {};
  if (rec.meta.genVersion === undefined) rec.meta.genVersion = 1;
  return rec;
}

// ---- IndexedDB -------------------------------------------------------------
class IDBBackend {
  constructor() { this.name = 'IndexedDB'; this.db = null; }
  open() {
    return new Promise((res, rej) => {
      let req;
      try { req = indexedDB.open('voxel-sandbox', 1); } catch (e) { rej(e); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('chunks')) {
          const s = db.createObjectStore('chunks', { keyPath: ['w', 'k'] });
          s.createIndex('w', 'w');
        }
      };
      req.onsuccess = () => { this.db = req.result; res(this); };
      req.onerror = () => rej(req.error);
      req.onblocked = () => rej(new Error('IndexedDB blocked'));
    });
  }
  tx(stores, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(stores, mode);
      let out;
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('aborted'));
      out = fn(t);
    });
  }
  req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async listWorlds() {
    const t = this.db.transaction('worlds', 'readonly');
    return await this.req(t.objectStore('worlds').getAll());
  }
  async getWorld(id) { const t = this.db.transaction('worlds', 'readonly'); return await this.req(t.objectStore('worlds').get(id)); }
  putWorld(rec) { return this.tx(['worlds'], 'readwrite', t => { t.objectStore('worlds').put(rec); }); }
  async getChunks(w) {
    const t = this.db.transaction('chunks', 'readonly');
    return await this.req(t.objectStore('chunks').index('w').getAll(w));
  }
  putChunks(w, recs) {
    if (!recs.length) return Promise.resolve();
    return this.tx(['chunks'], 'readwrite', t => { const s = t.objectStore('chunks'); for (const r of recs) s.put(Object.assign({}, r, { w })); });
  }
  deleteWorld(id) {
    return this.tx(['worlds', 'chunks'], 'readwrite', t => {
      t.objectStore('worlds').delete(id);
      t.objectStore('chunks').delete(IDBKeyRange.bound([id, ''], [id, '￿']));
    });
  }
}

// ---- localStorage fallback ---------------------------------------------------
class LSBackend {
  constructor() { this.name = 'localStorage'; }
  async open() { localStorage.setItem('vx.probe', '1'); localStorage.removeItem('vx.probe'); return this; }
  async listWorlds() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('vx.world.')) { try { out.push(JSON.parse(localStorage.getItem(k))); } catch (e) { /* skip */ } }
    }
    return out;
  }
  async getWorld(id) { const s = localStorage.getItem('vx.world.' + id); return s ? JSON.parse(s) : null; }
  async putWorld(rec) { localStorage.setItem('vx.world.' + rec.id, JSON.stringify(rec)); }
  async getChunks(w) { const s = localStorage.getItem('vx.chunks.' + w); return s ? Object.values(JSON.parse(s)) : []; }
  async putChunks(w, recs) {
    if (!recs.length) return;
    const s = localStorage.getItem('vx.chunks.' + w); const o = s ? JSON.parse(s) : {};
    for (const r of recs) o[r.k] = r;
    localStorage.setItem('vx.chunks.' + w, JSON.stringify(o)); // may throw QuotaExceededError
  }
  async deleteWorld(id) { localStorage.removeItem('vx.world.' + id); localStorage.removeItem('vx.chunks.' + id); }
}

class MemBackend {
  constructor() { this.name = 'memory'; this.w = new Map(); this.c = new Map(); }
  async open() { return this; }
  async listWorlds() { return [...this.w.values()]; }
  async getWorld(id) { return this.w.get(id) || null; }
  async putWorld(rec) { this.w.set(rec.id, JSON.parse(JSON.stringify(rec))); }
  async getChunks(w) { return [...(this.c.get(w) || new Map()).values()]; }
  async putChunks(w, recs) { if (!this.c.has(w)) this.c.set(w, new Map()); const m = this.c.get(w); for (const r of recs) m.set(r.k, r); }
  async deleteWorld(id) { this.w.delete(id); this.c.delete(id); }
}

async function openLocalStore() {
  for (const B of [IDBBackend, LSBackend]) {
    try { const s = await new B().open(); return s; } catch (e) { console.warn('Storage backend unavailable:', B.name, e); }
  }
  return new MemBackend();
}

// ---- Cloud mirror (Claude artifact `db` capability) -------------------------
class CloudSync {
  constructor() {
    this.enabled = false; this.db = null; this.uid = null;
    this.queue = []; this.running = false; this.status = 'off'; this.onStatus = null;
    this.lastError = '';
  }
  async init() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return false;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return false;
      const uid = await user.id();
      if (!uid) return false;
      this.db = db; this.uid = uid; this.enabled = true; this.setStatus('synced');
      return true;
    } catch (e) { console.warn('Cloud save unavailable', e); return false; }
  }
  setStatus(s) { this.status = s; if (this.onStatus) this.onStatus(s, this.queue.length); }
  worldsCol() { return this.db.collection('data/users/' + this.uid); }
  worldDoc(id) { return this.db.doc('data/users/' + this.uid + '/world~' + id); }
  chunksCol(id) { return this.worldDoc(id).collection('chunks'); }

  async listWorlds() {
    if (!this.enabled) return [];
    try {
      const snap = await this.worldsCol().where('type', '==', 'world').get();
      return snap.docs.map(d => d.data()).filter(Boolean).map(x => JSON.parse(JSON.stringify(x)));
    } catch (e) { this.fail(e); return []; }
  }
  async getWorld(id) {
    if (!this.enabled) return null;
    try { const s = await this.worldDoc(id).get(); return s.exists ? JSON.parse(JSON.stringify(s.data())) : null; }
    catch (e) { this.fail(e); return null; }
  }
  async pullChunks(id, onProgress) {
    const out = []; let last = '';
    for (;;) {
      const snap = await this.chunksCol(id).where('k', '>', last).orderBy('k').limit(400).get();
      for (const d of snap.docs) { const r = JSON.parse(JSON.stringify(d.data())); out.push(r); last = r.k; }
      if (onProgress) onProgress(out.length);
      if (snap.size < 400) break;
    }
    return out;
  }
  // Queue writes; they run one at a time in the background.
  pushChunk(worldId, rec) { this.enqueue({ kind: 'chunk', worldId, key: worldId + '|' + rec.k, rec }); }
  pushWorld(worldRec) { this.enqueue({ kind: 'world', worldId: worldRec.id, key: 'w|' + worldRec.id, rec: worldRec }); }
  deleteWorld(id) { this.enqueue({ kind: 'delete', worldId: id, key: 'd|' + id }); }
  enqueue(job) {
    if (!this.enabled) return;
    const i = this.queue.findIndex(j => j.key === job.key);
    if (i >= 0) this.queue.splice(i, 1);
    // world docs go last so the cloud "savedAt" only moves once its chunks are up
    if (job.kind === 'world') this.queue.push(job);
    else { const wi = this.queue.findIndex(j => j.kind === 'world'); if (wi >= 0) this.queue.splice(wi, 0, job); else this.queue.push(job); }
    this.run();
  }
  async run() {
    if (this.running || !this.enabled) return;
    this.running = true;
    this.setStatus('syncing');
    while (this.queue.length && this.enabled) {
      const job = this.queue[0];
      try {
        if (job.kind === 'chunk') await this.chunksCol(job.worldId).doc(job.rec.k).set(job.rec);
        else if (job.kind === 'world') await this.worldDoc(job.worldId).set(Object.assign({ type: 'world' }, job.rec));
        else if (job.kind === 'delete') {
          for (;;) {
            const snap = await this.chunksCol(job.worldId).limit(200).get();
            for (const d of snap.docs) await this.chunksCol(job.worldId).doc(d.id).delete();
            if (snap.size < 200) break;
          }
          await this.worldDoc(job.worldId).delete();
        }
        this.queue.shift();
        if (this.onStatus) this.onStatus('syncing', this.queue.length);
        await new Promise(r => setTimeout(r, 40));
      } catch (e) {
        const code = e && e.code;
        if (code === 'resource_exhausted' || code === 'unavailable') { this.setStatus('waiting'); await new Promise(r => setTimeout(r, 4000 + Math.random() * 2000)); continue; }
        this.fail(e);
        break;
      }
    }
    this.running = false;
    if (this.enabled) this.setStatus(this.queue.length ? 'syncing' : 'synced');
  }
  fail(e) {
    const code = e && e.code;
    console.warn('Cloud save error', e);
    this.lastError = code === 'quota_exceeded' ? 'Cloud storage is full' : (e && e.message) || String(e);
    if (code === 'invalid_argument' || code === 'quota_exceeded' || code === 'revoked' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') {
      this.enabled = false; this.setStatus('error');
    }
  }
}

// ---- SaveManager: what the game talks to -------------------------------------
class SaveManager {
  constructor() { this.local = null; this.cloud = new CloudSync(); this.ready = null; }
  init() {
    this.ready = (async () => {
      this.local = await openLocalStore();
      await this.cloud.init();
    })();
    return this.ready;
  }
  get backendName() { return this.local ? this.local.name : '…'; }

  async listWorlds() {
    await this.ready;
    const local = (await this.local.listWorlds().catch(() => [])).map(migrateWorldRecord);
    const cloud = (await this.cloud.listWorlds()).map(migrateWorldRecord);
    const map = new Map();
    for (const w of local) map.set(w.id, { rec: w, local: true, cloud: false, cloudNewer: false });
    for (const w of cloud) {
      const e = map.get(w.id);
      if (!e) map.set(w.id, { rec: w, local: false, cloud: true, cloudNewer: true });
      else { e.cloud = true; if ((w.savedAt || 0) > (e.rec.savedAt || 0)) { e.rec = w; e.cloudNewer = true; } }
    }
    return [...map.values()].sort((a, b) => (b.rec.savedAt || 0) - (a.rec.savedAt || 0));
  }

  // Loads a world: returns { rec, records: Map(chunkKey -> record) }
  async openWorld(id, onProgress) {
    await this.ready;
    let local = migrateWorldRecord(await this.local.getWorld(id).catch(() => null));
    const cloud = migrateWorldRecord(await this.cloud.getWorld(id));
    let rec = local;
    if (cloud && (!local || (cloud.savedAt || 0) > (local.savedAt || 0))) {
      if (onProgress) onProgress('Downloading world from your cloud save…');
      const chunks = await this.cloud.pullChunks(id, n => onProgress && onProgress(`Downloading world… ${n} chunks`));
      await this.local.putChunks(id, chunks);
      await this.local.putWorld(cloud);
      rec = cloud;
    }
    if (!rec) throw new Error('World not found');
    const list = await this.local.getChunks(id);
    const records = new Map();
    for (const r of list) { delete r.w; records.set(r.k, migrateChunkRecord(r)); }
    // Local is ahead of the cloud (played offline, or a sync was cut short): push the difference.
    if (this.cloud.enabled && (!cloud || (local && (local.savedAt || 0) > (cloud.savedAt || 0)))) {
      const since = cloud ? cloud.savedAt || 0 : 0;
      for (const r of records.values()) if ((r.t || 0) > since || !cloud) this.cloud.pushChunk(id, r);
      this.cloud.pushWorld(rec);
    }
    return { rec, records };
  }

  async saveWorld(rec, chunkRecs) {
    await this.ready;
    rec.savedAt = Date.now();
    rec.format = SAVE_FORMAT;
    rec.gameVersion = GAME_VERSION;
    const plain = JSON.parse(JSON.stringify(rec));
    try {
      await this.local.putChunks(rec.id, chunkRecs);
      await this.local.putWorld(plain);
    } catch (e) {
      console.error('Local save failed', e);
      if (this.local.name !== 'memory') { this.lastLocalError = e; }
      throw e;
    } finally {
      for (const c of chunkRecs) this.cloud.pushChunk(rec.id, c);
      this.cloud.pushWorld(plain);
    }
  }

  async deleteWorld(id) {
    await this.ready;
    await this.local.deleteWorld(id);
    this.cloud.deleteWorld(id);
  }

  async exportWorld(id) {
    const { rec, records } = await this.openWorld(id);
    return JSON.stringify({
      kind: 'voxel-sandbox-world', format: SAVE_FORMAT, gameVersion: GAME_VERSION, exportedAt: Date.now(),
      world: rec, chunks: [...records.values()],
    });
  }
  async importWorld(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { throw new Error('That file is not a world export (it is not valid JSON).'); }
    if (!o || o.kind !== 'voxel-sandbox-world' || !o.world) throw new Error('That file is not a Voxel Sandbox world export.');
    const rec = migrateWorldRecord(o.world);
    const existing = await this.local.getWorld(rec.id).catch(() => null);
    if (existing) { rec.id = 'w' + uid(); rec.meta.name = (rec.meta.name || 'World') + ' (imported)'; }
    const chunks = (o.chunks || []).map(c => migrateChunkRecord(Object.assign({}, c)));
    for (const c of chunks) delete c.w;
    await this.saveWorld(rec, chunks);
    return rec;
  }
}
