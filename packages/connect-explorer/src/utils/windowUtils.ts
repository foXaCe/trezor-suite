export const getQueryVariable = (variable: string) => {
    const query = window.location.hash.substring(3);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
        const queryVar = vars[i];
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        const pair = queryVar.split('=');
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        if (decodeURIComponent(pair[0]) === variable) {
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            return decodeURIComponent(pair[1]);
        }
    }
};
