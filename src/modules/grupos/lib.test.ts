// @ts-ignore bun test runner
import { describe, expect, test } from "bun:test";
import { cruzar, emojisDuplicados, parseLista, pontuar, textoSemana, type Participante } from "./lib";

const P = (o: Partial<Participante>): Participante => ({ id: o.username!, grupo_id: "g", nome_exibicao: null, emoji_habitual: null, apelidos: [], ativo: true, novata: false, entrou_em: "2026-01-01", username: "x", ...o });

describe("check de grupos", () => {
  test("formato antigo do Notas: ✅❌🆕 não viram emoji", () => {
    expect(parseLista("Lista de atualização da semana\n(Seg✅|Qua❌|Sex❌)\n✅=Atualizou\n1. @Adri.anacostaalves ❌\n2. @alinesaionery 🆕\n")).toEqual([
      { username: "adri.anacostaalves", emoji: "", lista: null }, { username: "alinesaionery", emoji: "", lista: null }]);
  });
  test("lista de emojis: 2 por linha, ZWJ, cabeçalho LISTA N e @ repetido", () => {
    const r = parseLista("LISTA 1 - de emojis escolhidos\n\n@claudia4343_silva ♋️\n@izabellycristina19 ❤️‍🩹\n@adv.larissagregorio   💕 @dannybene  💞\nLISTA 2 - outra\n@Kamylli_Sales 🍓\n@zen 🧘🏻‍♀️ @fenix 🐦‍🔥\n@dannybene 😮");
    expect(r).toEqual([
      { username: "claudia4343_silva", emoji: "♋️", lista: 1 },
      { username: "izabellycristina19", emoji: "❤️‍🩹", lista: 1 },
      { username: "adv.larissagregorio", emoji: "💕", lista: 1 },
      { username: "dannybene", emoji: "💞", lista: 1 },
      { username: "kamylli_sales", emoji: "🍓", lista: 2 },
      { username: "zen", emoji: "🧘🏻‍♀️", lista: 2 },
      { username: "fenix", emoji: "🐦‍🔥", lista: 2 },
    ]);
  });
  test("✅ escolhido como emoji é mantido fora do formato numerado", () => {
    expect(parseLista("@gaabydelenaa25 ✅\n@professora_kammylla ✅")).toEqual([
      { username: "gaabydelenaa25", emoji: "✅", lista: null }, { username: "professora_kammylla", emoji: "✅", lista: null }]);
  });
  test("formato antigo numerado: ✅ é status, emoji vazio", () => {
    expect(parseLista("1. @fulana ✅")).toEqual([{ username: "fulana", emoji: "", lista: null }]);
  });
  test("sugestão por emoji único = 0.75", () => {
    const m = cruzar([{ nome: "Fulana Qualquer", emoji: "🍓", cortado: false }], [P({ username: "kamylli", emoji_habitual: "🍓" }), P({ username: "outra", emoji_habitual: "💕" })]);
    expect(m[0].participante?.username).toBe("kamylli"); expect(m[0].confianca).toBe(0.75); expect(m[0].porEmoji).toBe(true);
  });
  test("sem sugestão com emoji duplicado (tom de pele não diferencia)", () => {
    const parts = [P({ username: "a", emoji_habitual: "👍🏼" }), P({ username: "b", emoji_habitual: "👍🏻" })];
    expect(cruzar([{ nome: "Fulana", emoji: "👍", cortado: false }], parts)[0].participante).toBeNull();
    expect(emojisDuplicados(parts).size).toBe(1);
  });
  test("❤️ é diferente de ❤️‍🩹", () => {
    const m = cruzar([{ nome: "Fulana", emoji: "❤️", cortado: false }], [P({ username: "iza", emoji_habitual: "❤️‍🩹" })]);
    expect(m[0].participante).toBeNull();
  });
  test("username exato = 1.0", () => expect(pontuar({ nome: "@alinesaionery", emoji: "", cortado: false }, P({ username: "alinesaionery" }))).toBe(1));
  test("apelido = 0.95", () => expect(pontuar({ nome: "Edna Kardashians", emoji: "", cortado: false }, P({ username: "edna1", apelidos: ["Edna Kardashians"] }))).toBe(0.95));
  test("cortado como prefixo = 0.85", () => expect(pontuar({ nome: "Vanessa Baggett | vida...", emoji: "", cortado: true }, P({ username: "vb", nome_exibicao: "Vanessa Baggett | vida real e maternidade" }))).toBe(0.85));
  test("emoji sozinho não pontua por nome", () => expect(pontuar({ nome: "Fulana", emoji: "🌸", cortado: false }, P({ username: "outra", emoji_habitual: "🌸" }))).toBe(0));
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
