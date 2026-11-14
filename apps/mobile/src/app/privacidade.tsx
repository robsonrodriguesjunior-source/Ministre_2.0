import { LegalPage } from '@/components/LegalPage';

// Política de Privacidade (LGPD). Pública: as lojas pedem um endereço aberto (app.ministreapp.com.br/privacidade).
export default function Privacidade() {
  return (
    <LegalPage
      title="Privacidade"
      updated="14 de novembro de 2026"
      intro="O Ministre organiza as escalas do seu ministério. Esta política explica, de forma simples, quais dados usamos, para quê e como você controla tudo."
      other={{ label: 'Ler os Termos de Uso', href: '/termos' }}
      sections={[
        {
          title: 'Quais dados usamos',
          body: [
            'Conta: nome, e-mail, senha (guardada de forma embaralhada, ninguém consegue ler) e, se você quiser, celular e foto.',
            'Ministério: de quais ministérios você participa, suas funções, as escalas em que foi escalado, suas respostas (confirmado ou não posso, com o motivo que você escrever) e os dias em que marcou indisponibilidade.',
            'Celular: quando você ativa os avisos, guardamos o endereço que o serviço de notificações do aparelho (Apple ou Google) cria para entregar as mensagens.',
          ],
        },
        {
          title: 'Para que usamos',
          body: [
            'Só para o funcionamento do app: montar escalas, avisar você, mostrar o repertório e permitir que os líderes organizem a equipe.',
            'Não vendemos dados, não mostramos anúncios e não usamos seus dados para nenhuma outra finalidade.',
          ],
        },
        {
          title: 'Quem vê',
          body: [
            'As pessoas do mesmo ministério veem seu nome, foto, funções e as escalas. O celular e o e-mail só os líderes veem.',
            'As notificações passam pelos serviços da Apple ou do Google apenas para chegar ao seu aparelho.',
          ],
        },
        {
          title: 'Onde ficam e por quanto tempo',
          body: [
            'Os dados ficam no servidor do Ministre e só trafegam por conexão protegida (HTTPS).',
            'Guardamos enquanto sua conta existir. Quando você exclui a conta, seus dados pessoais são apagados e o histórico de escalas fica anônimo ("Pessoa removida").',
          ],
        },
        {
          title: 'Seus direitos (LGPD)',
          body: [
            'Você pode ver e corrigir seus dados em Perfil › Meus dados, desligar os avisos em Perfil › Notificações e excluir a conta em Perfil › Excluir minha conta, a qualquer momento.',
            'Para qualquer pedido ou dúvida sobre seus dados: contato@ministreapp.com.br.',
          ],
        },
      ]}
    />
  );
}
