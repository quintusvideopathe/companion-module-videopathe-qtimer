export function buildBaseUrl(host, port) {
    const normalizedHost = String(host || '').trim();
    return `http://${normalizedHost}:${port}`;
}
export async function fetchJson(url, init) {
    const response = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText}${bodyText ? `: ${bodyText}` : ''}`);
    }
    return (await response.json());
}
export async function postJson(url, body) {
    const init = {
        method: 'POST',
    };
    if (body !== undefined) {
        init.body = JSON.stringify(body);
    }
    return fetchJson(url, init);
}
//# sourceMappingURL=api.js.map