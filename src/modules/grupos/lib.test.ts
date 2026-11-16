// @ts-ignore bun test runner
import { describe, expect, test } from "bun:test";
import { cruzar, parseLista, pontuar, textoSemana, type Participante } from "./lib";

const P = (o: Partial<Participante>): Participante => ({ id: o.username!, grupo_id: "g", nome_exibicao: null, emoji_habitual: null, apelidos: [], ativo: true, novata: false, entrou_em: "2026-01-01", username: "x", ...o });

describe("check de grupos", () => {
  test("parser extrai @ ignorando cabeçalho, número e emojis", () => {
    expect(parseLista("Lista de atualização da semana\n(Seg✅|Qua❌|Sex❌)\n✅=Atualizou\n1. @Adri.anacostaalves ❌\n2. @alinesaionery 🆕\n")).toEqual(["adri.anacostaalves", "alinesaionery"]);
  });
  test("username exato = 1.0", () => expect(pontuar({ nome: "@alinesaionery", emoji: "", cortado: false }, P({ username: "alinesaionery" }))).toBe(1));
  test("apelido = 0.95", () => expect(pontuar({ nome: "Edna Kardashians", emoji: "", cortado: false }, P({ username: "edna1", apelidos: ["Edna Kardashians"] }))).toBe(0.95));
  test("cortado como prefixo = 0.85", () => expect(pontuar({ nome: "Vanessa Baggett | vida...", emoji: "", cortado: true }, P({ username: "vb", nome_exibicao: "Vanessa Baggett | vida real e maternidade" }))).toBe(0.85));
  test("emoji sozinho nunca identifica", () => expect(pontuar({ nome: "Fulana", emoji: "🌸", cortado: false }, P({ username: "outra", emoji_habitual: "🌸" }))).toBe(0));
  test("emoji igual soma 0.1", () => expect(pontuar({ nome: "Edna Kardashians", emoji: "🌸", cortado: false }, P({ username: "e", apelidos: ["Edna Kardashians"], emoji_habitual: "🌸" }))).toBe(1));
  test("emoji desempata", () => {
    const m = cruzar([{ nome: "Ana...", emoji: "💖", cortado: true }], [P({ username: "anabela" }), P({ username: "anacarla", emoji_habitual: "💖" })]);
    expect(m[0].participante?.username).toBe("anacarla");
  });
  test("exportação em ordem alfabética com 🆕", () => {
    const a = P({ username: "bia" }), b = P({ username: "ana", novata: true });
    const t = textoSemana({ dias: ["seg", "qua", "sex"], fechados: new Set(["seg"]), participantes: [a, b], status: new Map([["bia", "ok"]]) });
    expect(t).toContain("(Seg✅|Qua❌|Sex❌)");
    expect(t).toContain("1. @ana 🆕\n2. @bia ✅");
  });
});
