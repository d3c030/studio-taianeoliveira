import type { SiteSection } from "./api";

export type SectionTipo = "hero" | "sobre" | "servicos" | "depoimentos" | "galeria" | "cupons" | "contato" | "faq";

export const TIPOS: { tipo: SectionTipo; label: string; descricao: string }[] = [
  { tipo: "hero", label: "Capa", descricao: "Título grande, frase e botão" },
  { tipo: "sobre", label: "Sobre", descricao: "Texto com foto" },
  { tipo: "servicos", label: "Serviços", descricao: "Lista de serviços com preço" },
  { tipo: "depoimentos", label: "Depoimentos", descricao: "O que as clientes dizem" },
  { tipo: "galeria", label: "Galeria", descricao: "Carrossel de fotos" },
  { tipo: "cupons", label: "Cupons", descricao: "Cupons de parceiras + Linktree" },
  { tipo: "faq", label: "Perguntas", descricao: "Perguntas frequentes" },
  { tipo: "contato", label: "Cadastro", descricao: "Formulário que abre o WhatsApp" },
];

export function novaSecao(tipo: SectionTipo): SiteSection {
  const id = crypto.randomUUID();
  const dados: Record<string, any> = {
    hero: { titulo: "Capa", imagem: "" },
    sobre: { titulo: "Sobre mim", texto: "Conte aqui sua história.", imagem: "" },
    servicos: { titulo: "Como posso te ajudar" },
    depoimentos: { titulo: "Depoimentos", itens: [{ nome: "Cliente", texto: "Amei o resultado!" }] },
    galeria: { titulo: "Galeria", fotos: [] },
    cupons: { titulo: "Cupons disponíveis", subtitulo: "Mostre o código no atendimento." },
    faq: { titulo: "Perguntas frequentes" },
    contato: { titulo: "Quero levar meu perfil para o próximo nível", subtitulo: "Preencha o cadastro e continue a conversa comigo direto no WhatsApp.", whatsapp: "", instagram: "" },
  }[tipo];
  return { id, tipo, visivel: true, dados };
}

export function labelTipo(tipo: string) {
  return TIPOS.find((t) => t.tipo === tipo)?.label ?? tipo;
}

export function waLink(phone?: string, text?: string) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return "";
  const num = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
