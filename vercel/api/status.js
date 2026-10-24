const BOT_URL = (process.env.BOT_URL || 'http://sexysmart.seyori.name.ng:2005').replace(/\/$/, '');

module.exports = async (req, res) => {
    const numero = String((req.query && req.query.numero) || '').replace(/[^0-9]/g, '');
    if (numero.length < 8 || numero.length > 15) return res.status(400).json({ error: 'invalid_number' });

    try {
        const r = await fetch(BOT_URL + '/api/code/' + numero, { signal: AbortSignal.timeout(8000) });
        const data = await r.json().catch(() => ({ status: 'unknown' }));
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ status: data.status || 'unknown' });
    } catch (e) {
        res.status(502).json({ error: 'bot_unreachable' });
    }
};
      
