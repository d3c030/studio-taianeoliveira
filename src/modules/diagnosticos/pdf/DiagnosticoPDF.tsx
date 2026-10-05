import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { DiagItem } from "../lib/editor-api";

export type PdfImagem = { src: string; ratio: number; legenda: string; tipo: "positivo" | "negativo"; item_id: string | null };
export type PdfData = {
  titulo: string;
  feitoPor: string;
  paraInstagram: string;
  data: string;
  logo: string | null;
  cor: string;
  rodape: string;
  itens: DiagItem[];
  imagens: PdfImagem[];
  plano: string;
  convite?: "ambos" | "mentoria" | null;
  financeiro: null | {
    itens: { descricao: string; valor: number; desconto: number }[];
    pagamentos: { data: string; forma: string; valor: number }[];
    bruto: number; desconto: number; total: number; pago: number; aberto: number;
  };
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const VERDE = "#3F7D5A";
const LARANJA = "#C2622D";
const TEXTO = "#2B2523";
const SUAVE = "#8A7B76";
const LINHA = "#E8DEDA";

const mk = (cor: string) =>
  StyleSheet.create({
    page: { paddingTop: 62, paddingBottom: 70, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.5, color: TEXTO },
    cover: { paddingHorizontal: 60, paddingVertical: 80, fontFamily: "Helvetica", color: TEXTO, justifyContent: "center", alignItems: "center", textAlign: "center" },
    header: { position: "absolute", top: 18, left: 48, right: 48, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: LINHA, paddingBottom: 6, fontSize: 8, lineHeight: 1.2, color: SUAVE },
    headerLogo: { width: 22, height: 22, borderRadius: 11, marginRight: 8 },
    coverTitle: { fontSize: 24, fontFamily: "Helvetica-Bold", color: cor, lineHeight: 1.35, marginBottom: 8 },
    coverLine: { fontSize: 12, lineHeight: 1.6 },
    coverBar: { width: 60, height: 3, backgroundColor: cor, marginVertical: 26 },
    h1: { fontSize: 18, fontFamily: "Helvetica-Bold", color: cor, lineHeight: 1.3, marginBottom: 6 },
    h1Bar: { width: 40, height: 2, backgroundColor: cor, marginBottom: 18 },
    card: { backgroundColor: "#FBF8F6", padding: 16, marginBottom: 16 },
    itemTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", lineHeight: 1.35 },
    badgeRow: { flexDirection: "row", marginTop: 6, marginBottom: 12 },
    badge: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1, paddingTop: 4, paddingBottom: 3, paddingHorizontal: 8, borderRadius: 8, letterSpacing: 0.5 },
    blockLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: SUAVE, lineHeight: 1.2, marginBottom: 4 },
    block: { marginBottom: 10 },
    tarefa: { backgroundColor: "#F8F1EE", borderRadius: 6, padding: 12, marginBottom: 4 },
    parabens: { backgroundColor: "#EAF3EE", borderRadius: 6, padding: 12, color: VERDE },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
    imgBox: { paddingHorizontal: 6, paddingBottom: 14, alignItems: "center" },
    imgFrame: { padding: 3, backgroundColor: LINHA },
    caption: { fontSize: 8.5, color: "#5E534F", lineHeight: 1.4, marginTop: 4, textAlign: "center" },
    secHead: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1.2, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 6, marginBottom: 12, marginTop: 6 },
    footer: { position: "absolute", bottom: 26, left: 48, right: 48, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: LINHA, paddingTop: 8, fontSize: 8, lineHeight: 1.2, color: SUAVE },
    footerLogo: { width: 30, height: 18, objectFit: "contain", marginRight: 8 },
    li: { flexDirection: "row", marginBottom: 3 },
    bullet: { width: 12, color: cor },
    para: { marginBottom: 4 },
    tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINHA, paddingVertical: 7, paddingHorizontal: 10 },
    tCell: { fontSize: 10 },
    tNum: { flex: 1.2, fontSize: 10, textAlign: "right" },
    sumRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 10, marginBottom: 3 },
  });

type S = ReturnType<typeof mk>;

function Rich({ text, s }: { text: string; s: S }) {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>{part.slice(2, -2)}</Text>
      ) : (
        part
      ),
    );
  return (
    <View>
      {text.split("\n").map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <Text key={i} style={{ fontSize: 4, lineHeight: 1 }}>{" "}</Text>;
        const m = line.match(/^\s*(?:[•\-*]|\d+[.)])\s+(.*)$/);
        return m ? (
          <View key={i} style={s.li} wrap={false}>
            <Text style={s.bullet}>•</Text>
            <Text style={{ flex: 1 }}>{inline(m[1])}</Text>
          </View>
        ) : (
          <Text key={i} style={s.para}>{inline(line)}</Text>
        );
      })}
    </View>
  );
}

function Footer({ d, s }: { d: PdfData; s: S }) {
  return (
    <>
    <View style={s.header} fixed>
      {d.logo && <Image src={d.logo} style={s.headerLogo} />}
      <Text style={{ flex: 1 }}>{d.titulo}</Text>
      <Text>{d.paraInstagram}</Text>
    </View>
    <View style={s.footer} fixed>
      <Text style={{ flex: 1 }}>{[d.feitoPor, d.rodape, `© ${new Date().getFullYear()} Todos os direitos reservados`].filter(Boolean).join(" · ")}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
    </>
  );
}

const AREA = 450;
function tamanho(r: number) {
  const ratio = Number.isFinite(r) && r > 0 ? Math.min(4, Math.max(0.25, r)) : 0.75;
  const largo = ratio >= 1.15;
  let w = largo ? AREA - 12 : (AREA - 24) / 2;
  let h = w / ratio;
  const maxH = largo ? 280 : 250;
  if (h > maxH) { h = maxH; w = h * ratio; }
  return { w, h, largo };
}

function alturaImgs(imgs: PdfImagem[]) {
  let h = 0, retratos = 0;
  for (const im of imgs) { const t = tamanho(im.ratio); if (t.largo) h += t.h + 30; else if (retratos++ % 2 === 0) h += t.h + 30; }
  return h;
}

function Imagens({ imgs, s, label }: { imgs: PdfImagem[]; s: S; label?: string }) {
  // Linhas independentes (sem flexWrap): grades longas com quebra de página travam o gerador
  const linhas: PdfImagem[][] = [];
  let par: PdfImagem[] = [];
  for (const im of imgs) {
    if (tamanho(im.ratio).largo) {
      if (par.length) { linhas.push(par); par = []; }
      linhas.push([im]);
    } else {
      par.push(im);
      if (par.length === 2) { linhas.push(par); par = []; }
    }
  }
  if (par.length) linhas.push(par);
  return (
    <View>
      {linhas.map((linha, li) => (
        <View key={li} wrap={false}>
          {li === 0 && !!label && <Text style={s.blockLabel}>{label}</Text>}
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
          {linha.map((im, i) => {
            const t = tamanho(im.ratio);
            return (
              <View key={i} style={[s.imgBox, { width: t.largo ? "100%" : "50%" }]}>
                <View style={s.imgFrame}>
                  <Image src={im.src} style={{ width: t.w, height: t.h }} />
                </View>
                {!!im.legenda && <Text style={[s.caption, { width: t.w }]}>{im.legenda}</Text>}
              </View>
            );
          })}
          </View>
        </View>
      ))}
    </View>
  );
}

function Titulo({ t, s }: { t: string; s: S }) {
  return (
    <View wrap={false} minPresenceAhead={140} style={{ marginTop: 8 }}>
      <Text style={s.h1}>{t}</Text>
      <View style={s.h1Bar} />
    </View>
  );
}

export function DiagnosticoPDF({ d }: { d: PdfData }) {
  const s = mk(d.cor);
  const grupos: { secao: string; itens: DiagItem[] }[] = [];
  for (const it of d.itens) {
    const last = grupos[grupos.length - 1];
    if (last && last.secao === it.secao) last.itens.push(it);
    else grupos.push({ secao: it.secao, itens: [it] });
  }
  const gerais = d.imagens.filter((i) => !i.item_id);
  const pos = gerais.filter((i) => i.tipo === "positivo");
  const neg = gerais.filter((i) => i.tipo === "negativo");
  const numero = new Map(d.itens.map((it, i) => [it.id, i + 1]));
  const tarefas = d.itens.filter((it) => it.status !== "ideal" && it.sua_tarefa.trim());

  return (
    <Document title={d.titulo} author={d.feitoPor}>
      <Page size="A4" style={s.cover}>
        {d.logo && <Image src={d.logo} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 28 }} />}
        <Text style={s.coverTitle}>{d.titulo}</Text>
        <View style={s.coverBar} />
        {!!d.feitoPor && <Text style={s.coverLine}>Feito por: {d.feitoPor}</Text>}
        <Text style={s.coverLine}>Para: {d.paraInstagram}</Text>
        <Text style={[s.coverLine, { color: SUAVE, marginTop: 10 }]}>{d.data}</Text>
      </Page>

      <Page size="A4" style={s.page}>
      {grupos.map((g, gi) => (
        <View key={gi} style={{ marginBottom: 10 }}>
          <Titulo t={g.secao || "Diagnóstico"} s={s} />
          {g.itens.map((it) => {
            const n = numero.get(it.id);
            const ideal = it.status === "ideal";
            const imgs = d.imagens.filter((im) => im.item_id === it.id);
            return (
              <View key={it.id} style={s.card}>
                <View wrap={false}>
                  <Text style={s.itemTitle}>Item {n} – {it.titulo}</Text>
                  <View style={s.badgeRow}>
                    <Text style={[s.badge, { backgroundColor: ideal ? VERDE : LARANJA }]}>
                      {ideal ? "IDEAL" : "PRECISA DE AJUSTES"}
                    </Text>
                  </View>
                </View>
                {!!it.o_que_eu_vi.trim() && (
                  <View style={s.block}>
                    <Text style={s.blockLabel} minPresenceAhead={30}>O que eu vi</Text>
                    <Rich text={it.o_que_eu_vi} s={s} />
                  </View>
                )}
                {ideal ? (
                  <Text style={s.parabens} wrap={false}>Parabéns! Este ponto já está ideal — continue assim.</Text>
                ) : (
                  !!it.sua_tarefa.trim() && (
                    <View style={s.tarefa}>
                      <Text style={s.blockLabel} minPresenceAhead={30}>Sua tarefa</Text>
                      <Rich text={it.sua_tarefa} s={s} />
                    </View>
                  )
                )}
                {imgs.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Imagens imgs={imgs} s={s} label="Registros da análise" />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {(pos.length > 0 || neg.length > 0) && (
        <View>
          <Titulo t="Destaques visuais" s={s} />
          {pos.length > 0 && (
            <View>
              <Text style={[s.secHead, { backgroundColor: VERDE }]} minPresenceAhead={120}>O que está funcionando</Text>
              <Imagens imgs={pos} s={s} />
            </View>
          )}
          {neg.length > 0 && (
            <View>
              <Text style={[s.secHead, { backgroundColor: LARANJA }]} minPresenceAhead={120}>O que precisa mudar</Text>
              <Imagens imgs={neg} s={s} />
            </View>
          )}
        </View>
      )}

      <View>
        <Titulo t="Plano de Ação – Seus Próximos Passos" s={s} />
        {tarefas.map((it) => {
          const n = numero.get(it.id);
          return (
            <View key={it.id} style={s.card}>
              <Text style={[s.itemTitle, { marginBottom: 8, color: d.cor }]} minPresenceAhead={40}>{n}. {it.titulo}</Text>
              {!!it.o_que_eu_vi.trim() && (
                <View style={s.block}>
                  <Text style={s.blockLabel} minPresenceAhead={30}>Análise (Item {n})</Text>
                  <Rich text={it.o_que_eu_vi} s={s} />
                </View>
              )}
              <View style={s.tarefa}>
                <Text style={s.blockLabel} minPresenceAhead={30}>Sua tarefa</Text>
                <Rich text={it.sua_tarefa} s={s} />
              </View>
            </View>
          );
        })}
        {!!d.plano.trim() && <View style={{ marginTop: 6 }}><Rich text={d.plano} s={s} /></View>}
      </View>
      {d.financeiro && (
        <View>
          <Titulo t="Investimento da Consultoria" s={s} />
          <View style={{ borderTopWidth: 1, borderTopColor: LINHA }}>
            <View style={[s.tRow, { backgroundColor: "#F8F1EE" }]}>
              <Text style={[s.tCell, { flex: 3, fontFamily: "Helvetica-Bold" }]}>Descrição</Text>
              <Text style={[s.tNum, { fontFamily: "Helvetica-Bold" }]}>Valor</Text>
              <Text style={[s.tNum, { fontFamily: "Helvetica-Bold" }]}>Desconto</Text>
              <Text style={[s.tNum, { fontFamily: "Helvetica-Bold" }]}>Total</Text>
            </View>
            {d.financeiro.itens.map((it, i) => (
              <View key={i} style={s.tRow} wrap={false}>
                <Text style={[s.tCell, { flex: 3 }]}>{it.descricao}</Text>
                <Text style={s.tNum}>{brl(it.valor)}</Text>
                <Text style={s.tNum}>{it.desconto ? `- ${brl(it.desconto)}` : "—"}</Text>
                <Text style={s.tNum}>{brl(Math.max(0, it.valor - it.desconto))}</Text>
              </View>
            ))}
          </View>
          <View style={{ alignSelf: "flex-end", width: 240, marginTop: 14 }} wrap={false}>
            {([["Subtotal", d.financeiro.bruto], ["Descontos", -d.financeiro.desconto], ["Total contratado", d.financeiro.total], ["Valor pago", d.financeiro.pago]] as const).map(([l, v]) => (
              <View key={l} style={s.sumRow}><Text>{l}</Text><Text>{v < 0 ? `- ${brl(-v)}` : brl(v)}</Text></View>
            ))}
            <View style={[s.sumRow, { borderTopWidth: 1, borderTopColor: LINHA, paddingTop: 6, marginTop: 4 }]}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.financeiro.aberto > 0 ? "Em aberto" : "Situação"}</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", color: d.financeiro.aberto > 0 ? LARANJA : VERDE }}>
                {d.financeiro.aberto > 0 ? brl(d.financeiro.aberto) : "Quitado"}
              </Text>
            </View>
          </View>
          {d.financeiro.pagamentos.length > 0 && (
            <View style={{ marginTop: 22 }} wrap={false}>
              <Text style={s.blockLabel}>Pagamentos recebidos</Text>
              {d.financeiro.pagamentos.map((p, i) => (
                <View key={i} style={s.sumRow}><Text>{p.data}{p.forma ? ` · ${p.forma}` : ""}</Text><Text>{brl(p.valor)}</Text></View>
              ))}
            </View>
          )}
        </View>
      )}
      {d.convite && (
        <View wrap={false} style={{ marginTop: 26, padding: 18, borderRadius: 10, borderWidth: 1, borderColor: d.cor, backgroundColor: "#FBF5F2" }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13, color: d.cor, marginBottom: 8 }}>Próximo passo</Text>
          <Text style={{ fontSize: 10.5, lineHeight: 1.6, color: TEXTO }}>
            {d.convite === "mentoria"
              ? "Você já deu um grande passo com a Consultoria 1:1. Se quiser ir além e transformar seu perfil em uma vitrine que atrai parcerias, com acompanhamento para prospectar, negociar e fechar com as marcas da forma certa, venha para a minha Mentoria para Parcerias."
              : 'Agora você já tem o mapa exato do que precisa ajustar na sua "vitrine". Se você quiser o meu acompanhamento de perto para colocar tudo isso em prática, montar um cronograma de postagens e aprender a abordar as marcas da forma certa, venha para a minha Consultoria 1:1 ou Mentoria para Parcerias.'}
          </Text>
        </View>
      )}
      <Footer d={d} s={s} />
      </Page>
    </Document>
  );
}
