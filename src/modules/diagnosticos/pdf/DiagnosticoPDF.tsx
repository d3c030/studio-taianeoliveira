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

const mk = (cor: string) =>
  StyleSheet.create({
    page: { paddingTop: 40, paddingBottom: 60, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 11, color: "#2B2523" },
    cover: { padding: 60, fontFamily: "Helvetica", color: "#2B2523", justifyContent: "center", alignItems: "center", textAlign: "center" },
    coverLogo: { width: 180, height: 120, objectFit: "contain", marginBottom: 40 },
    coverTitle: { fontSize: 26, fontFamily: "Helvetica-Bold", color: cor, marginBottom: 30, lineHeight: 1.25 },
    coverLine: { fontSize: 13, marginBottom: 6 },
    coverBar: { width: 60, height: 3, backgroundColor: cor, marginVertical: 24 },
    h1: { fontSize: 20, fontFamily: "Helvetica-Bold", color: cor, marginBottom: 16 },
    card: { borderWidth: 1, borderColor: "#E8DEDA", borderRadius: 8, padding: 14, marginBottom: 14 },
    itemHead: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    itemTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", flex: 1 },
    badge: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#FFFFFF", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
    blockLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: "#8A7B76", marginBottom: 3 },
    block: { marginBottom: 8 },
    tarefa: { backgroundColor: "#F8F1EE", borderRadius: 6, padding: 10 },
    parabens: { backgroundColor: "#EAF3EE", borderRadius: 6, padding: 10, color: VERDE },
    grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
    imgBox: { width: "33.33%", padding: 5 },
    img: { width: "100%", height: 170, objectFit: "cover", borderRadius: 6 },
    caption: { fontSize: 9, color: "#5E534F", marginTop: 3 },
    secHead: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#FFFFFF", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginBottom: 10, marginTop: 6 },
    footer: { position: "absolute", bottom: 22, left: 44, right: 44, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#E8DEDA", paddingTop: 8, fontSize: 8, color: "#8A7B76" },
    pageNum: { lineHeight: 1, position: "absolute", bottom: 28, left: 44, right: 44, textAlign: "right", fontSize: 8, color: "#8A7B76" },
    footerLogo: { width: 34, height: 20, objectFit: "contain", marginRight: 8 },
    li: { flexDirection: "row", marginBottom: 3 },
    bullet: { width: 12, color: cor },
  });

function Rich({ text, s }: { text: string; s: ReturnType<typeof mk> }) {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>{part.slice(2, -2)}</Text>
      ) : (
        <Text key={i}>{part}</Text>
      ),
    );
  return (
    <View style={{ lineHeight: 1.45 }}>
      {text.split("\n").map((line, i) =>
        line.startsWith("• ") ? (
          <View key={i} style={s.li}>
            <Text style={s.bullet}>•</Text>
            <Text style={{ flex: 1 }}>{inline(line.slice(2))}</Text>
          </View>
        ) : (
          <Text key={i} style={{ marginBottom: line.trim() ? 2 : 6 }}>{inline(line) }</Text>
        ),
      )}
    </View>
  );
}

function Footer({ d, s }: { d: PdfData; s: ReturnType<typeof mk> }) {
  return (
    <>
      <View style={s.footer} fixed>
        {d.logo && <Image src={d.logo} style={s.footerLogo} />}
        <Text style={{ flex: 1 }}>{[d.feitoPor, d.rodape].filter(Boolean).join(" · ")}</Text>
      </View>
    </>
  );
}

function Imagens({ imgs, s }: { imgs: PdfImagem[]; s: ReturnType<typeof mk> }) {
  return (
    <View style={s.grid}>
      {imgs.map((im, i) => (
        <View key={i} style={s.imgBox} wrap={false}>
          <Image src={im.src} style={s.img} />
          {!!im.legenda && <Text style={s.caption}>{im.legenda}</Text>}
        </View>
      ))}
    </View>
  );
}

export function DiagnosticoPDF({ d }: { d: PdfData }) {
  const s = mk(d.cor);
  // Group consecutive items by section, preserving order
  const grupos: { secao: string; itens: DiagItem[] }[] = [];
  for (const it of d.itens) {
    const last = grupos[grupos.length - 1];
    if (last && last.secao === it.secao) last.itens.push(it);
    else grupos.push({ secao: it.secao, itens: [it] });
  }
  const gerais = d.imagens.filter((i) => !i.item_id);
  const pos = gerais.filter((i) => i.tipo === "positivo");
  const neg = gerais.filter((i) => i.tipo === "negativo");
  let n = 0;

  return (
    <Document title={d.titulo} author={d.feitoPor}>
      <Page size="A4" style={s.cover}>
        {d.logo && <Image src={d.logo} style={s.coverLogo} />}
        <Text style={s.coverTitle}>{d.titulo}</Text>
        <View style={s.coverBar} />
        {!!d.feitoPor && <Text style={s.coverLine}>Feito por: {d.feitoPor}</Text>}
        <Text style={s.coverLine}>Para: {d.paraInstagram}</Text>
        <Text style={[s.coverLine, { color: "#8A7B76", marginTop: 10 }]}>{d.data}</Text>
      </Page>

      {grupos.map((g, gi) => (
        <Page key={gi} size="A4" style={s.page}>
          <Text style={s.h1}>{g.secao || "Diagnóstico"}</Text>
          {g.itens.map((it) => {
            n += 1;
            const ideal = it.status === "ideal";
            const imgs = d.imagens.filter((im) => im.item_id === it.id);
            return (
              <View key={it.id} style={s.card} wrap={imgs.length > 0}>
                <View style={s.itemHead}>
                  <Text style={s.itemTitle}>Item {n} – {it.titulo}</Text>
                  <Text style={[s.badge, { backgroundColor: ideal ? VERDE : LARANJA }]}>
                    {ideal ? "IDEAL" : "PRECISA DE AJUSTES"}
                  </Text>
                </View>
                {!!it.o_que_eu_vi.trim() && (
                  <View style={s.block}>
                    <Text style={s.blockLabel}>O que eu vi</Text>
                    <Rich text={it.o_que_eu_vi} s={s} />
                  </View>
                )}
                {ideal ? (
                  <Text style={s.parabens}>Parabéns! Este ponto já está ideal — continue assim.</Text>
                ) : (
                  !!it.sua_tarefa.trim() && (
                    <View style={s.tarefa}>
                      <Text style={s.blockLabel}>Sua tarefa</Text>
                      <Rich text={it.sua_tarefa} s={s} />
                    </View>
                  )
                )}
                {imgs.length > 0 && <View style={{ marginTop: 10 }}><Imagens imgs={imgs} s={s} /></View>}
              </View>
            );
          })}
          <Footer d={d} s={s} />
          <Text fixed style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </Page>
      ))}

      {(pos.length > 0 || neg.length > 0) && (
        <Page size="A4" style={s.page}>
          <Text style={s.h1}>Destaques visuais</Text>
          {pos.length > 0 && (
            <View>
              <Text style={[s.secHead, { backgroundColor: VERDE }]}>O que está funcionando</Text>
              <Imagens imgs={pos} s={s} />
            </View>
          )}
          {neg.length > 0 && (
            <View>
              <Text style={[s.secHead, { backgroundColor: LARANJA }]}>O que precisa mudar</Text>
              <Imagens imgs={neg} s={s} />
            </View>
          )}
          <Footer d={d} s={s} />
          <Text fixed style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </Page>
      )}

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Plano de Ação – Seus Próximos Passos</Text>
        <Rich text={d.plano} s={s} />
        <Footer d={d} s={s} />
          <Text fixed style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
