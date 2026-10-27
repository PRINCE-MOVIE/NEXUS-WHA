const DEFAULT_URLS = [
    'http://sexysmart.seyori.name.ng:2005',
    'http://sexysmart.seyori.name.ng:2038',
    'http://167.71.41.73:3000'
];

const BOTS = (process.env.BOT_URLS ? process.env.BOT_URLS.split(',') : DEFAULT_URLS)
    .map(u => u.trim().replace(/\/$/, ''))
    .filter(Boolean);

async function getStatus(base, numero) {
    try {
        const r = await fetch(base + '/api/code/' + numero, { signal: AbortSignal.timeout(6000) });
        const d = await r.json();
        return d.status || 'unknown';
    } catch (e) {
        return null;
    }
}

module.exports = { BOTS, getStatus };
