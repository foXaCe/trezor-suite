export const getQueryVariable = (variable: string) => {
    const query = window.location.hash.substring(3);
    const vars = query.split('&');
    for (const entry of vars) {
        const pair = entry.split('=');
        const key = pair[0];
        const value = pair[1];
        if (key !== undefined && decodeURIComponent(key) === variable) {
            return value !== undefined ? decodeURIComponent(value) : undefined;
        }
    }
};
