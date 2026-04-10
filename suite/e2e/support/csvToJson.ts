export const csvToJson = (data: string) => {
    const lines = data.split('\n');
    const result = [];
    const headerLine = lines[0];
    if (!headerLine) {
        return [];
    }
    const headers = headerLine.split(',');
    for (let i = 1; i < lines.length; i++) {
        const obj: Record<string, string> = {};
        const currentline = lines[i]?.split(',') ?? [];

        for (const [j, header] of headers.entries()) {
            if (header) {
                obj[header] = currentline[j] ?? '';
            }
        }
        result.push(obj);
    }

    return result;
};
