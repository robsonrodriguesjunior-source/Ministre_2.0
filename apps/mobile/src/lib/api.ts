// Conversa com a API do Ministre. Endereço vem de EXPO_PUBLIC_API_URL (arquivo .env).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

type AuthProvider = () => { token: string | null; ministryId: number | null };
type UnauthorizedHandler = () => void;

let authProvider: AuthProvider = () => ({ token: null, ministryId: null });
let onUnauthorized: UnauthorizedHandler = () => undefined;

/** A sessão (store) se registra aqui para cada chamada levar o token e o ministério ativo. */
export function configureApi(provider: AuthProvider, unauthorized: UnauthorizedHandler) {
  authProvider = provider;
  onUnauthorized = unauthorized;
}

/** Erro da API já com a mensagem em português e os erros por campo. */
export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** Primeira mensagem de um campo (ex.: "email"). */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0];
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Manda o cabeçalho do ministério ativo (rotas de dentro do ministério). */
  ministry?: boolean;
};

export async function api<T>(path: string, { method = 'GET', body, ministry = false }: Options = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'Endereço da API não configurado.');

  const { token, ministryId } = authProvider();
  const headers: Record<string, string> = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData; // foto: o navegador monta o cabeçalho
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (ministry && ministryId) headers['X-Ministry-Id'] = String(ministryId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), isForm ? 60000 : 15000);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão. Confira a internet e tente de novo.');
  } finally {
    clearTimeout(timer);
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string; errors?: Record<string, string[]> })
    | null;

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized();
    throw new ApiError(
      response.status,
      data?.message ?? 'Algo deu errado. Tente de novo.',
      data?.errors ?? {},
    );
  }

  return data as T;
}

export type Health = { status: string; app: string; database: 'ok' | 'error'; time: string };

export const getHealth = () => api<Health>('/health');
