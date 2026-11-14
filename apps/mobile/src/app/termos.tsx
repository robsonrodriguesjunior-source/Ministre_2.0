import { LegalPage } from '@/components/LegalPage';

// Termos de Uso. Público, como a Política de Privacidade.
export default function Termos() {
  return (
    <LegalPage
      title="Termos de Uso"
      updated="14 de novembro de 2026"
      intro="Ao usar o Ministre, você concorda com estes termos. Eles são curtos de propósito."
      other={{ label: 'Ler a Política de Privacidade', href: '/privacidade' }}
      sections={[
        {
          title: 'O que é o Ministre',
          body: ['Um app para ministérios de igreja organizarem escalas, repertório, avisos e a equipe.'],
        },
        {
          title: 'Sua conta',
          body: [
            'Use dados verdadeiros e guarde sua senha com cuidado. Você é responsável pelo que for feito com a sua conta.',
            'Você pode sair de um ministério ou excluir sua conta quando quiser, pelo próprio app.',
          ],
        },
        {
          title: 'Líderes e equipe',
          body: [
            'Os líderes de cada ministério decidem quem participa, as funções e as escalas, e podem remover pessoas do ministério.',
            'Os avisos e as escalas são de responsabilidade de quem os publica.',
          ],
        },
        {
          title: 'Uso correto',
          body: [
            'Não publique conteúdo ofensivo, ilegal ou que viole direitos de outras pessoas, como letras e cifras protegidas por direitos autorais sem autorização.',
            'Contas que desrespeitarem estes termos podem ser suspensas.',
          ],
        },
        {
          title: 'Disponibilidade',
          body: [
            'Trabalhamos para o app funcionar sempre, inclusive o Modo Palco sem internet, mas pode haver pausas para manutenção.',
            'Estes termos podem mudar; quando isso acontecer, a data no topo é atualizada.',
          ],
        },
        { title: 'Contato', body: ['contato@ministreapp.com.br'] },
      ]}
    />
  );
}
