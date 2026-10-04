export type TemplateItem = {
  secao: string;
  titulo: string;
  o_que_eu_vi: string;
  sua_tarefa: string;
};

export const TITULO_PADRAO = "Diagnóstico de Perfil: Seu passaporte para parcerias";

export const TEMPLATE_PADRAO: TemplateItem[] = [
  {
    secao: "O Raio-X do Perfil",
    titulo: "A Balança de Seguidores (O Alerta das Marcas)",
    o_que_eu_vi:
      "Você está seguindo muito mais pessoas do que o número de seguidores que tem. As marcas olham isso e acham que você não tem tanta autoridade.",
    sua_tarefa:
      "Fazer uma 'limpeza' diária e estratégica. Pare de seguir contas inativas ou que não interagem com você. A meta é ter o número de 'Seguindo' bem menor que o de 'Seguidores'.",
  },
  {
    secao: "O Raio-X do Perfil",
    titulo: "A Biografia Magnética (Seu Cartão de Visitas)",
    o_que_eu_vi:
      "Sua bio não deixa claro sobre o que você fala ou como as marcas podem te contatar.",
    sua_tarefa:
      "Vamos reestruturar sua bio em 3 linhas:\nLinha 1: O que você faz/Seu nicho (Ex: Lifestyle, Maternidade, Beleza).\nLinha 2: Um detalhe de conexão (Ex: Rotina real no interior, Apaixonada por skincare).\nLinha 3: Contato profissional (Email ou Link do WhatsApp).",
  },
  {
    secao: "A Vitrine",
    titulo: "Destaques que Vendem",
    o_que_eu_vi:
      "Destaques confusos, sem capas padrão e com nomes cortados. Eles parecem um álbum de família e não um portfólio.",
    sua_tarefa:
      "Excluir os destaques que não fazem sentido e criar 4 principais com capas minimalistas:\nQuem Sou: Sua história.\nRotina/Bastidores: O dia a dia.\nRecebidos/Marcas: Para provar que você já consome produtos.\n(Seu nicho principal, ex: Treinos/Beleza).",
  },
  {
    secao: "A Vitrine",
    titulo: "Feed e Linha Editorial (Seu Palco)",
    o_que_eu_vi:
      "Tem muitos assuntos misturados (frases, memes, fotos aleatórias) sem uma estética definida. Isso confunde os seguidores e as marcas.",
    sua_tarefa:
      "Arquive fotos que não combinam mais com a imagem profissional que você quer passar. Defina apenas 3 pilares de conteúdo (ex: Skincare, Moda e Rotina) e foque neles. Coloque capas com textos chamativos nos seus vídeos de Reels.",
  },
];
