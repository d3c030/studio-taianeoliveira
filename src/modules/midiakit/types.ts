export type MkDados = {
  nome?: string; arroba?: string; nichos?: string; estilo?: string; marcas?: string;
  seguidores_ig?: number; seguidores_tt?: number; seguidores_yt?: number;
  engajamento?: number; alcance?: number; visualizacoes?: number;
  publico_feminino?: number; faixa_18_24?: number; faixa_25_34?: number; faixa_35_44?: number; faixa_45?: number;
  interesses?: string; cidade?: string; email?: string; whatsapp?: string; capa?: string;
  cor_fundo?: string; cor_texto?: string; cor_destaque?: string; cor_texto_destaque?: string;
};
export type MkTextos = {
  titulo?: string; slogan?: string; bio?: string; nichos?: string[]; audiencia?: string;
  servicos?: { nome: string; descricao: string }[]; marcas?: string; cta?: string;
};
export type MkFoto = { url: string; legenda?: string };
export type MkKit = { id: string; dados: MkDados; textos: MkTextos; fotos: MkFoto[]; token: string; publico: boolean; atualizado_em: string };

export const fmtNum = (n?: number) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} mi`;
  return Math.round(v).toLocaleString("pt-BR");
};
export const totalSeguidores = (d: MkDados) => Number(d.seguidores_ig ?? 0) + Number(d.seguidores_tt ?? 0) + Number(d.seguidores_yt ?? 0);

/** Conserta números inteiros lidos errado por versões antigas ("144.245" virava 144,245). */
export const corrigeDados = (d: MkDados): MkDados => {
  const out = { ...d };
  for (const k of ["seguidores_ig", "seguidores_tt", "seguidores_yt", "alcance", "visualizacoes"] as const) {
    const v = Number(out[k]);
    if (Number.isFinite(v) && v > 0 && v < 1000 && !Number.isInteger(v)) out[k] = Math.round(v * 1000);
  }
  return out;
};
