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
      },
    });
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 210, ph = 297;
    const pxPorPagina = Math.floor((canvas.width * ph) / pw);
    const margem = 12 * escala; // respiro no topo das páginas seguintes

    let y = 0, pagina = 0;
    while (y < canvas.height - 2) {
      let fim = Math.min(y + pxPorPagina - (pagina ? margem : 0), canvas.height);
      if (fim < canvas.height) {
        // Recua o corte para antes de qualquer bloco que ficaria partido (só se o bloco couber numa página).
        for (let guard = 0; guard < 50; guard++) {
          const corta = blocos.filter((b) => b.top < fim - 1 && b.bottom > fim + 1 && b.top > y + 4 && b.bottom - b.top < pxPorPagina - margem);
          if (!corta.length) break;
          fim = Math.min(...corta.map((b) => b.top)) - 4;
        }
        if (fim <= y + pxPorPagina * 0.25) fim = Math.min(y + pxPorPagina - (pagina ? margem : 0), canvas.height);
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
