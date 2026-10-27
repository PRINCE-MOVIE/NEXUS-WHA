const { BOTS, getStatus } = require('./_bots');

module.exports = async (req, res) => {
    const numero = String((req.query && req.query.numero) || '').replace(/[^0-9]/g, '');
    if (numero.length < 8 || numero.length > 15) return res.status(400).json({ error: 'invalid_number' });

    const list = await Promise.all(BOTS.map(b => getStatus(b, numero)));
    const valid = list.filter(s => s !== null);
    if (!valid.length) return res.status(502).json({ error: 'bot_unreachable' });

    const status = valid.includes('connected') ? 'connected' : (valid.find(s => s !== 'unknown') || 'unknown');

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ status });
};
