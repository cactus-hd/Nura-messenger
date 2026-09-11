const API = 'api.php';
export async function api(action, options = {}) {
    const url = new URL(API, window.location.href);
    url.searchParams.set('action', action);
    if (options.qs) {
        for (const [key, value] of Object.entries(options.qs)) {
            if (value !== undefined && value !== null)
                url.searchParams.set(key, String(value));
        }
    }
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options
    });
    let payload = {};
    try {
        payload = (await response.json());
    }
    catch {
        payload = {};
    }
    if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || `Request failed (${response.status})`);
    }
    return payload;
}
//# sourceMappingURL=api.js.map