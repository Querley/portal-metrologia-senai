import { FormularioSolicitacao } from '../../componentes/formulario-solicitacao';
import { MarcaOficial } from '../../componentes/marca-oficial';
import Link from 'next/link';
import '../publico.css';

export const metadata = { title:'Solicitar orçamento — Portal de Metrologia SENAI' };
export default function Solicitar() { return <main><header className="cabecalho-publico"><div className="navegacao-simples"><Link className="marca marca-fundo-claro" href="/"><MarcaOficial /></Link><nav><Link href="/">Início</Link><a href="/catalogo">Serviços</a><a href="/privacidade">Privacidade</a><a href="/portal">Entrar</a></nav></div><h1>Solicite uma análise</h1><p>Compartilhe os dados essenciais do desafio. Nesta prévia, o envio é demonstrativo e não persiste informações.</p></header><section className="conteudo-publico pagina-form"><FormularioSolicitacao /></section></main>; }
