const { BOTS, getStatus } = require('./_bots');
const store = require('./_store');

const RETRY = new Set(['server_full', 'bot_unreachable', 'bad_response', 'code_failed']);

function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

async function tryPair(base, numero) {
    try {
        const r = await fetch(base + '/api/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero }),
            signal: AbortSignal.timeout(15000)
        });
        const data = await r.json().catch(() => ({ error: 'bad_response' }));
        return { status: r.status, data };
    } catch (e) {
        return { status: 502, data: { error: 'bot_unreachable' } };
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const numero = String((req.body && req.body.numero) || '').replace(/[^0-9]/g, '');
    if (numero.length < 8 || numero.length > 15) return res.status(400).json({ error: 'invalid_number' });

    const statuses = await Promise.all(BOTS.map(b => getStatus(b, numero)));
    if (statuses.includes('connected')) {
        await store.touch(numero); // numéro déjà connecté : on le retient
        return res.status(409).json({ error: 'already_connected' });
    }

    let last = { status: 502, data: { error: 'bot_unreachable' } };

    for (const base of shuffle(BOTS)) {
        const out = await tryPair(base, numero);
        if (out.data && out.data.success) {
            await store.ensure(numero); // enregistré en attente, passera "connecté" dès que le bot confirme
            return res.status(200).json(out.data);
        }
        last = out;
        const code = out.data && out.data.error;
        if (!RETRY.has(code) && out.status < 500) break;
    }

    res.status(last.status).json(last.data);
};
