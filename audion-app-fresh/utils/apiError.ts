export async function extractErrorMessageFromResponse(response: Response): Promise<string> {
  let message = `Request failed: ${response.status} ${response.statusText}`;
  try {
    const data = await response.json();
    const detail = (data && (data.detail ?? data.message)) || null;
    if (Array.isArray(detail)) {
      message = detail
        .map((d: any) => {
          if (d && typeof d === 'object') {
            const loc = Array.isArray(d.loc) ? d.loc.join('.') : d.loc;
            const msg = d.msg || d.message || JSON.stringify(d);
            return loc ? `${loc}: ${msg}` : msg;
          }
          return String(d);
        })
        .join('\n');
    } else if (typeof detail === 'string') {
      message = detail;
    } else if (detail && typeof detail === 'object') {
      message = (detail as any).msg || JSON.stringify(detail);
    }
  } catch (_) {
    // ignore parse errors
  }
  return message;
}

export function extractErrorMessageFromError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (error instanceof Error) return error.message || 'Error';
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
