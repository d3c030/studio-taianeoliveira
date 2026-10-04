import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { DiagItem } from "../lib/editor-api";

export type PdfImagem = { src: string; legenda: string; tipo: "positivo" | "negativo"; item_id: string | null };
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
};

const VERDE = "#3F7D5A";
const LARANJA = "#C2622D";
const TEXTO = "#2B2523";
const SUAVE = "#8A7B76";
const LINHA = "#E8DEDA";

const mk = (cor: string) =>
  StyleSheet.create({
    page: { paddingTop: 48, paddingBottom: 70, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.5, color: TEXTO },
    cover: { paddingHorizontal: 60, paddingVertical: 80, fontFamily: "Helvetica", color: TEXTO, justifyContent: "center", alignItems: "center", textAlign: "center" },
    coverLogo: { width: 170, height: 120, objectFit: "contain", marginBottom: 36 },
    coverTitle: { fontSize: 24, fontFamily: "Helvetica-Bold", color: cor, lineHeight: 1.35, marginBottom: 8 },
    coverLine: { fontSize: 12, lineHeight: 1.6 },
    coverBar: { width: 60, height: 3, backgroundColor: cor, marginVertical: 26 },
    h1: { fontSize: 18, fontFamily: "Helvetica-Bold", color: cor, lineHeight: 1.3, marginBottom: 6 },
    h1Bar: { width: 40, height: 2, backgroundColor: cor, marginBottom: 18 },
    card: { borderWidth: 1, borderColor: LINHA, borderRadius: 8, padding: 16, marginBottom: 16 },
    itemTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", lineHeight: 1.35 },
    badgeRow: { flexDirection: "row", marginTop: 6, marginBottom: 12 },
    badge: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1, paddingTop: 4, paddingBottom: 3, paddingHorizontal: 8, borderRadius: 8, letterSpacing: 0.5 },
    blockLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: SUAVE, lineHeight: 1.2, marginBottom: 4 },
    block: { marginBottom: 10 },
    tarefa: { backgroundColor: "#F8F1EE", borderRadius: 6, padding: 12, marginBottom: 4 },
    parabens: { backgroundColor: "#EAF3EE", borderRadius: 6, padding: 12, color: VERDE },
    grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
    imgBox: { width: "50%", paddingHorizontal: 6, paddingBottom: 12 },
    imgFrame: { borderWidth: 1, borderColor: LINHA, borderRadius: 6, padding: 4, backgroundColor: "#FAF7F5", alignItems: "center" },
    img: { maxWidth: "100%", maxHeight: 330, objectFit: "contain" },
    caption: { fontSize: 8.5, color: "#5E534F", lineHeight: 1.4, marginTop: 4 },
    secHead: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1.2, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 6, marginBottom: 12, marginTop: 6 },
    footer: { position: "absolute", bottom: 26, left: 48, right: 48, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: LINHA, paddingTop: 8, fontSize: 8, lineHeight: 1.2, color: SUAVE },
    footerLogo: { width: 30, height: 18, objectFit: "contain", marginRight: 8 },
    li: { flexDirection: "row", marginBottom: 3 },
    bullet: { width: 12, color: cor },
    para: { marginBottom: 4 },
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
        if (!line.trim()) return <View key={i} style={{ height: 6 }} />;
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
    <View style={s.footer} fixed>
      {d.logo && <Image src={d.logo} style={s.footerLogo} />}
      <Text style={{ flex: 1 }}>{[d.feitoPor, d.rodape].filter(Boolean).join(" · ")}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Imagens({ imgs, s }: { imgs: PdfImagem[]; s: S }) {
  return (
    <View style={s.grid}>
      {imgs.map((im, i) => (
        <View key={i} style={s.imgBox} wrap={false}>
          <View style={s.imgFrame}>
            <Image src={im.src} style={s.img} />
          </View>
          {!!im.legenda && <Text style={s.caption}>{im.legenda}</Text>}
        </View>
      ))}
    </View>
  );
}

function Titulo({ t, s }: { t: string; s: S }) {
  return (
    <View wrap={false}>
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
        {d.logo && <Image src={d.logo} style={s.coverLogo} />}
        <Text style={s.coverTitle}>{d.titulo}</Text>
        <View style={s.coverBar} />
        {!!d.feitoPor && <Text style={s.coverLine}>Feito por: {d.feitoPor}</Text>}
        <Text style={s.coverLine}>Para: {d.paraInstagram}</Text>
        <Text style={[s.coverLine, { color: SUAVE, marginTop: 10 }]}>{d.data}</Text>
      </Page>

      {grupos.map((g, gi) => (
        <Page key={gi} size="A4" style={s.page}>
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
                    <Text style={s.blockLabel} minPresenceAhead={120}>Registros da análise</Text>
                    <Imagens imgs={imgs} s={s} />
                  </View>
                )}
              </View>
            );
          })}
          <Footer d={d} s={s} />
        </Page>
      ))}

      {(pos.length > 0 || neg.length > 0) && (
        <Page size="A4" style={s.page}>
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
          <Footer d={d} s={s} />
        </Page>
      )}

      <Page size="A4" style={s.page}>
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
        <Footer d={d} s={s} />
      </Page>
    </Document>
  );
}
