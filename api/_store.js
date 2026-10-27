// Petit stockage persistant via l'API REST d'Upstash Redis / Vercel KV.
// Variables d'environnement (l'une ou l'autre paire) :
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   KV_REST_API_URL        + KV_REST_API_TOKEN
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const KEY = 'nexus:devices';

const enabled = () => Boolean(URL_ && TOKEN);

async function cmd(args) {
    const r = await fetch(URL_, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(6000)
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || 'store_error');
    return d.result;
}

// Retourne { numero: {added, ever, live, since, last} }
async function all() {
    const raw = await cmd(['HGETALL', KEY]);
    const out = {};
    const pairs = Array.isArray(raw) ? raw : Object.entries(raw || {}).flat();
    for (let i = 0; i < pairs.length; i += 2) {
        try { out[pairs[i]] = JSON.parse(pairs[i + 1]); } catch (e) {}
    }
    return out;
}

const put = (num, rec) => cmd(['HSET', KEY, num, JSON.stringify(rec)]);
const del = num => cmd(['HDEL', KEY, num]);

// Les deux fonctions ci-dessous ne lèvent jamais d'erreur : l'appairage ne doit pas dépendre du stockage.
async function ensure(num) {
    if (!enabled()) return;
    try {
        await cmd(['HSETNX', KEY, num, JSON.stringify({ added: Date.now(), ever: false, live: false, since: null, last: null })]);
    } catch (e) {}
}

async function touch(num) {
    if (!enabled()) return;
    try {
        const v = await cmd(['HGET', KEY, num]);
        const now = Date.now();
        const cur = (v && JSON.parse(v)) || { added: now, ever: false, live: false, since: null, last: null };
        if (!cur.live) cur.since = now;
        cur.live = true; cur.ever = true; cur.last = now;
        await put(num, cur);
    } catch (e) {}
}

module.exports = { enabled, all, put, del, ensure, touch };
