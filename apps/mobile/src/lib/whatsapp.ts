import { Linking } from 'react-native';

/** Número brasileiro para o wa.me: só dígitos, com 55 na frente quando vier com DDD (10 ou 11 dígitos). */
export function waNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 13) return digits;
  return null;
}

/** Mensagem do convite pessoal (cadastro direto pelo líder). */
export function personalInviteText(name: string, ministry: string, link: string, code: string) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return (
    `Olá, ${first}! Cadastrei você no ${ministry} no Ministre, o app das nossas escalas. ` +
    `Toque no link para entrar (leva 1 minuto): ${link}\n` +
    `Se pedir, o código é ${code}.`
  );
}

/** Abre o WhatsApp na conversa com a pessoa (ou na escolha de contato, se não houver número). */
export function openWhatsApp(phone: string | null | undefined, text: string) {
  const number = waNumber(phone);
  const url = `https://wa.me/${number ?? ''}?text=${encodeURIComponent(text)}`;
  return Linking.openURL(url).catch(() => undefined);
}
