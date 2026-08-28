import { CabecalhoPublico } from '../../componentes/cabecalho-publico';
import { RodapePublico } from '../../componentes/rodape-publico';
import '../publico.css';

export default function Privacidade() {
  return <main>
    <CabecalhoPublico titulo="Privacidade e uso seguro" texto="Diretrizes da demonstração pública; o texto institucional definitivo será validado antes da operação com dados reais." />
    <article className="conteudo-publico privacidade">
      <p><strong>Última atualização:</strong> 28 de agosto de 2026.</p>
      <h2>Sobre esta demonstração</h2>
      <p>A versão atual usa dados sintéticos e não envia o formulário público para uma base de produção. Não informe dados pessoais, CNPJ real, desenhos industriais ou qualquer conteúdo confidencial.</p>
      <h2>Finalidades previstas</h2>
      <p>Na operação futura, os dados serão usados para identificar a empresa e seus contatos, analisar solicitações, preparar a pré-proposta do laboratório, acompanhar os trabalhos e manter o canal de mensagens. A proposta oficial continuará sendo produzida pelo SENAI no Nectar, fora deste portal.</p>
      <h2>Acesso do cliente</h2>
      <p>A solicitação inicial não exige login. Depois da análise, a equipe poderá convidar contatos da empresa para uma área autenticada. O vínculo precisa ser aprovado e a autorização no banco limita cada pessoa aos registros da própria empresa.</p>
      <h2>Arquivos e inteligência artificial</h2>
      <ul><li>Anexos permanecerão privados, com acesso autenticado e download autorizado.</li><li>Anexos, preços, margens, clientes e contatos nunca serão enviados ao provedor de IA.</li><li>Dados internos serão sanitizados e mostrados ao usuário antes de qualquer envio.</li></ul>
      <h2>Seus direitos e contato</h2>
      <p>O canal oficial, o controlador, o encarregado de dados, as bases legais e os prazos de retenção serão incluídos depois da validação institucional e jurídica. Até lá, esta página não deve ser tratada como o aviso legal definitivo.</p>
    </article>
    <RodapePublico />
  </main>;
}
