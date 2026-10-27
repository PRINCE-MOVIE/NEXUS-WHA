const { BOTS, getStatus } = require('./_bots');
const store = require('./_store');

const PENDING_TTL = 24 * 3600 * 1000; // un code jamais utilisé est oublié après 24 h

// Numéros à enregistrer d'office (ceux déjà connectés avant la mise en place de cette liste) :
// SEED_NUMBERS=243812345678,22912345678
const SEED = (process.env.SEED_NUMBERS || '').split(',').map(n => n.replace(/\D/g, '')).filter(n => n.length >= 8 && n.length <= 15);
let seeded = false;

// true = connecté, false = non connecté, null = aucun bot n'a répondu
async function isLive(num) {
    const list = await Promise.all(BOTS.map(b => getStatus(b, num)));
    const valid = list.filter(s => s !== null);
    if (!valid.length) return null;
    return valid.includes('connected');
}

async function mapChunks(arr, size, fn) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(...await Promise.all(arr.slice(i, i + size).map(fn)));
    }
    return out;
}

// MASK_NUMBERS=1 pour masquer le milieu des numéros dans la liste publique
function show(num) {
    if (process.env.MASK_NUMBERS !== '1' || num.length < 8) return num;
    return num.slice(0, 4) + '•'.repeat(num.length - 7) + num.slice(-3);
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
    if (!store.enabled()) return res.status(503).json({ error: 'storage_not_configured' });

    try {
        if (!seeded) { await Promise.all(SEED.map(n => store.ensure(n))); seeded = true; }

        const rec = await store.all();
        const nums = Object.keys(rec);
        const states = await mapChunks(nums, 10, isLive);
        const now = Date.now();

        const connected = [], history = [], writes = [];
        let silent = 0;

        nums.forEach((num, i) => {
            const d = rec[num], st = states[i];
            if (st === null) {
                silent++;
            } else if (st) {
                if (!d.live) d.since = now;
                d.live = true; d.ever = true; d.last = now;
                writes.push(store.put(num, d));
            } else if (d.live) {
                d.live = false;
                writes.push(store.put(num, d));
            } else if (!d.ever && now - d.added > PENDING_TTL) {
                writes.push(store.del(num));
                return;
            }
            if (!d.ever) return; // code généré mais jamais connecté
            (d.live ? connected : history).push({ num: show(num), since: d.since, last: d.last });
        });

        await Promise.allSettled(writes);

        connected.sort((a, b) => (b.since || 0) - (a.since || 0));
        history.sort((a, b) => (b.last || 0) - (a.last || 0));

        res.status(200).json({
            connected, history,
            checkedAt: now,
            unreachable: nums.length > 0 && silent === nums.length
        });
    } catch (e) {
        res.status(502).json({ error: 'store_unreachable' });
    }
};
