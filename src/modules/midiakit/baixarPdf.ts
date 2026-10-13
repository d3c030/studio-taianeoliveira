/** Gera o PDF do Mídia Kit direto no navegador (funciona no celular, sem janela de impressão). */
export async function baixarPdfKit(el: HTMLElement, nome: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const largura = 800;
  const clone = el.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, { position: "fixed", left: "-10000px", top: "0", width: `${largura}px` });
  document.body.appendChild(clone);
  try {
    await Promise.all([...clone.querySelectorAll("img")].map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })));
    const canvas = await html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: null, width: largura, windowWidth: largura });
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 210, ph = 297;
    const pxPorPagina = Math.floor((canvas.width * ph) / pw);
    // Corta em pontos sem conteúdo quando possível, para não partir fotos.
    const ctx = canvas.getContext("2d")!;
    const linhaVazia = (y: number) => {
      const d = ctx.getImageData(0, y, canvas.width, 1).data;
      for (let i = 4; i < d.length; i += 16) if (Math.abs(d[i] - d[0]) + Math.abs(d[i + 1] - d[1]) + Math.abs(d[i + 2] - d[2]) > 30) return false;
      return true;
    };
    let y = 0, pagina = 0;
    while (y < canvas.height) {
      let fim = Math.min(y + pxPorPagina, canvas.height);
      if (fim < canvas.height) {
        for (let t = fim; t > y + pxPorPagina * 0.6; t -= 2) if (linhaVazia(t)) { fim = t; break; }
      }
      const parte = document.createElement("canvas");
      parte.width = canvas.width; parte.height = fim - y;
      parte.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, fim - y, 0, 0, canvas.width, fim - y);
      if (pagina++) pdf.addPage();
      pdf.addImage(parte.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, pw, ((fim - y) * pw) / canvas.width);
      y = fim;
    }
    pdf.save(`midia-kit-${(nome || "kit").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  } finally {
    clone.remove();
  }
}
