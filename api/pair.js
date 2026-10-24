const BOT_URL = (process.env.BOT_URL || 'http://sexysmart.seyori.name.ng:2005').replace(/\/$/, '');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const numero = String((req.body && req.body.numero) || '').replace(/[^0-9]/g, '');
    if (numero.length < 8 || numero.length > 15) return res.status(400).json({ error: 'invalid_number' });

    try {
        const r = await fetch(BOT_URL + '/api/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero }),
            signal: AbortSignal.timeout(25000)
        });
        const data = await r.json().catch(() => ({ error: 'bad_response' }));
        res.status(r.status).json(data);
    } catch (e) {
        res.status(502).json({ error: 'bot_unreachable' });
    }
};
