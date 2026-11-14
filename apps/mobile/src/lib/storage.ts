import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Guarda o login no aparelho: cofre do sistema (SecureStore) no app; armazenamento do navegador na web.
// Na web pode falhar (aba anônima, dados bloqueados): o app continua funcionando, só pede login de novo.

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value === null) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, value);
    } catch {
      // sem armazenamento: segue sem lembrar
    }
    return;
  }
  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // idem
  }
}
