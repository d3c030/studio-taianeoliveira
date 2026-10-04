import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade | Taiane Oliveira" },
      { name: "description", content: "Como seus dados são usados no atendimento de consultoria de Taiane Oliveira." },
      { property: "og:title", content: "Política de privacidade | Taiane Oliveira" },
      { property: "og:description", content: "Como seus dados são usados no atendimento de consultoria." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-foreground">
      <Link to="/agendar" className="text-sm text-muted-foreground hover:text-brand">← Voltar</Link>
      <h1 className="mt-6 font-display text-4xl">Política de privacidade</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
        <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD), explico aqui como seus dados são tratados.</p>
        <p><strong className="text-foreground">Quais dados coletamos:</strong> nome, @ do Instagram, WhatsApp, e-mail e o objetivo que você descreve no formulário.</p>
        <p><strong className="text-foreground">Para que usamos:</strong> exclusivamente para entrar em contato, preparar seu diagnóstico e realizar o atendimento de consultoria.</p>
        <p><strong className="text-foreground">Compartilhamento:</strong> seus dados não são vendidos nem compartilhados com terceiros.</p>
        <p><strong className="text-foreground">Seus direitos:</strong> você pode pedir a qualquer momento a consulta, correção ou exclusão dos seus dados, basta enviar uma mensagem pelo WhatsApp.</p>
      </div>
    </main>
  );
}
