// Endereço da API. Desenvolvimento e produção vêm de EXPO_PUBLIC_API_URL (arquivo .env).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export type Health = {
  status: string;
  app: string;
  database: 'ok' | 'error';
  time: string;
};

export async function getHealth(): Promise<Health> {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL não configurada');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_URL}/api/v1/health`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as Health;
  } finally {
    clearTimeout(timer);
  }
}
