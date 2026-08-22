import Image from 'next/image';

export function MarcaOficial({ classe = '' }: { classe?: string }) {
  return <Image className={`marca-oficial ${classe}`} src="/imagens/marca-senai-zeiss.png" width={4692} height={436} sizes="(max-width: 600px) 245px, 330px" alt="Centro de Excelência em Metrologia — SENAI ZEISS" priority />;
}
