export type MkDados = {
  nome?: string; arroba?: string; nichos?: string; estilo?: string; marcas?: string;
  seguidores_ig?: number; seguidores_tt?: number; seguidores_yt?: number;
  engajamento?: number; alcance?: number; visualizacoes?: number;
  publico_feminino?: number; faixa_18_24?: number; faixa_25_34?: number; faixa_35_44?: number; faixa_45?: number;
  interesses?: string; cidade?: string; email?: string; whatsapp?: string; capa?: string;
};
export type MkTextos = {
  titulo?: string; slogan?: string; bio?: string; nichos?: string[]; audiencia?: string;
  servicos?: { nome: string; descricao: string }[]; marcas?: string; cta?: string;
};
export type MkFoto = { url: string; legenda?: string };
export type MkKit = { id: string; dados: MkDados; textos: MkTextos; fotos: MkFoto[]; token: string; publico: boolean; atualizado_em: string };

export const fmtNum = (n?: number) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(".", ",")}K`;
  return String(v);
};
export const totalSeguidores = (d: MkDados) => Number(d.seguidores_ig ?? 0) + Number(d.seguidores_tt ?? 0) + Number(d.seguidores_yt ?? 0);
