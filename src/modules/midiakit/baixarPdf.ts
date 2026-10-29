/** Gera o PDF do Mídia Kit direto no navegador (funciona no celular, sem janela de impressão). */
export async function baixarPdfKit(el: HTMLElement, nome: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const largura = 800;
  const escala = 2;
  const clone = el.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, { position: "absolute", left: "-10000px", top: "0", width: `${largura}px`, maxWidth: "none", height: "auto", overflow: "visible" });
  clone.classList.add("mk-pdf");
  document.body.appendChild(clone);
  try {
    await Promise.all([...clone.querySelectorAll("img")].map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const altura = Math.ceil(clone.scrollHeight);

    // Blocos que não podem ser partidos entre páginas (fotos, cards, gráficos, contato...).
    // Medidos dentro da cópia que o html2canvas desenha (mesma largura e mesmo layout do PDF).
    let blocos: { top: number; bottom: number }[] = [];
    const canvas = await html2canvas(clone, {
      scale: escala, useCORS: true, backgroundColor: null, width: largura, height: altura, windowWidth: largura, windowHeight: altura,
      onclone: (_doc, alvo) => {
        const base = alvo.getBoundingClientRect().top;
        blocos = [...alvo.querySelectorAll<HTMLElement>("figure, img, .break-inside-avoid, section, h2, p, li, a")]
          .map((b) => { const r = b.getBoundingClientRect(); return { top: (r.top - base) * escala, bottom: (r.bottom - base) * escala }; })
          .filter((b) => b.bottom - b.top > 0);
        // Título de seção nunca fica sozinho no fim da página: vai junto do começo do conteúdo.
        alvo.querySelectorAll<HTMLElement>("h2").forEach((h) => {
          const r = h.getBoundingClientRect();
          const prox = h.nextElementSibling?.querySelector("figure, img, div, p") ?? h.nextElementSibling;
          const pr = prox?.getBoundingClientRect();
          const fimBloco = pr ? Math.min(pr.bottom, r.bottom + 420) : r.bottom + 120;
          blocos.push({ top: (r.top - base) * escala, bottom: (fimBloco - base) * escala });
        });
      },
    });
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 210, ph = 297;
    const pxPorPagina = Math.floor((canvas.width * ph) / pw);
    const margem = 12 * escala; // respiro no topo das páginas seguintes

    // Ignora a sobra em branco no final (evita uma última página vazia).
    const cctx = canvas.getContext("2d")!;
    let fimConteudo = canvas.height;
    for (let t = canvas.height - 1; t > 0; t -= 4) {
      const d = cctx.getImageData(0, t, canvas.width, 1).data;
      let vazio = true;
      for (let i = 0; i < d.length; i += 32) if (d[i + 3] > 10 && (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245)) { vazio = false; break; }
      if (!vazio) { fimConteudo = Math.min(canvas.height, t + 8 * escala); break; }
    }

    let y = 0, pagina = 0;
    while (fimConteudo - y > 4 * escala) {
      let fim = Math.min(y + pxPorPagina - (pagina ? margem : 0), fimConteudo);
      if (fim < fimConteudo) {
        // Recua o corte para antes de qualquer bloco que ficaria partido (só se o bloco couber numa página).
        for (let guard = 0; guard < 50; guard++) {
          const corta = blocos.filter((b) => b.top < fim - 1 && b.bottom > fim + 1 && b.top > y + 4 && b.bottom - b.top < pxPorPagina - margem);
          if (!corta.length) break;
          fim = Math.min(...corta.map((b) => b.top)) - 4;
        }
        if (fim <= y + pxPorPagina * 0.25) fim = Math.min(y + pxPorPagina - (pagina ? margem : 0), fimConteudo);
      }
      const h = Math.ceil(fim - y);
      const parte = document.createElement("canvas");
      parte.width = canvas.width; parte.height = h;
      const pctx = parte.getContext("2d")!;
      pctx.fillStyle = "#ffffff"; pctx.fillRect(0, 0, canvas.width, h);
      pctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (pagina) {
        pdf.addPage();
        const px = canvas.getContext("2d")!.getImageData(8, Math.min(Math.round(y) + 1, canvas.height - 1), 1, 1).data;
        if (px[3] > 0) { pdf.setFillColor(px[0], px[1], px[2]); pdf.rect(0, 0, pw, ph, "F"); }
      }
      const topo = pagina ? (margem * pw) / canvas.width : 0;
      pdf.addImage(parte.toDataURL("image/jpeg", 0.92), "JPEG", 0, topo, pw, (h * pw) / canvas.width);
      pagina++;
      y = fim;
    }
    pdf.save(`midia-kit-${(nome || "kit").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  } finally {
    clone.remove();
  }
}
