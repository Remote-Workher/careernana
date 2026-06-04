// Shared resume → PDF renderer.
//
// Strategy: render the ENTIRE resume once into a single tall canvas (so all
// layout, columns, backgrounds and spacing are preserved exactly as on screen),
// then slice it into A4 pages along boundaries derived from logical sections
// marked with `data-pdf-section`. This avoids both mid-paragraph cuts AND the
// "sections look off when captured individually" problem.

export async function renderResumePdfBlob(sourceEl: HTMLElement): Promise<Blob> {
  await (document as any).fonts?.ready?.catch?.(() => undefined);

  const A4_CSS_WIDTH = 794; // ≈ 210mm at 96dpi

  // Stage off-screen at a fixed A4 width so mobile renders like desktop.
  const stage = document.createElement("div");
  stage.style.position = "fixed";
  stage.style.left = "-10000px";
  stage.style.top = "0";
  stage.style.width = `${A4_CSS_WIDTH}px`;
  stage.style.background = "#ffffff";
  stage.style.zIndex = "-1";
  stage.style.pointerEvents = "none";
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.style.width = `${A4_CSS_WIDTH}px`;
  clone.style.maxWidth = "none";
  clone.style.transform = "none";
  clone.style.filter = "none";
  stage.appendChild(clone);
  document.body.appendChild(stage);

  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const html2canvas = (await import("html2canvas-pro")).default;
    const { jsPDF } = await import("jspdf");

    const scale = Math.max(2, (window.devicePixelRatio || 1) * 2);
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const pageWidthMM = pdf.internal.pageSize.getWidth();   // 210mm
    const pageHeightMM = pdf.internal.pageSize.getHeight(); // 297mm

    const cloneRect = clone.getBoundingClientRect();
    const cssWidth = A4_CSS_WIDTH;
    const cssHeight = Math.max(clone.scrollHeight, cloneRect.height);

    // 1) Single full-resume capture — preserves layout perfectly.
    const fullCanvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 0,
      width: cssWidth,
      height: cssHeight,
      windowWidth: cssWidth,
      windowHeight: cssHeight,
      ignoreElements: (node) =>
        node instanceof HTMLElement && node.dataset.noPrint === "true",
    });

    // Conversion factors
    const pxPerMM_css = cssWidth / pageWidthMM;          // CSS px per mm
    const pageHeightCssPx = pageHeightMM * pxPerMM_css;  // one A4 page in CSS px
    const canvasPxPerCssPx = fullCanvas.width / cssWidth;

    // Top padding on pages 2+ so text never starts flush at the top edge.
    const SUBSEQUENT_TOP_PAD_MM = 18;
    const subsequentTopPadCss = SUBSEQUENT_TOP_PAD_MM * pxPerMM_css;

    // 2) Determine section boundaries (CSS px Y offsets within the clone).
    const cloneTop = clone.getBoundingClientRect().top;
    const sectionEls = Array.from(
      clone.querySelectorAll<HTMLElement>("[data-pdf-section]")
    );
    const boundaries: number[] = [];
    for (const el of sectionEls) {
      const r = el.getBoundingClientRect();
      const top = r.top - cloneTop;
      if (top > 4) boundaries.push(top); // ignore the very first (= 0)
    }
    boundaries.sort((a, b) => a - b);

    // 3) Walk through the clone and slice into pages. First page = full height;
    //    subsequent pages = reduced height (top padding leaves breathing room).
    const totalCssHeight = cssHeight;
    const pageBreaks: number[] = [0];
    let cursor = 0;
    let isFirstPage = true;
    while (cursor < totalCssHeight - 1) {
      const availableCss = isFirstPage
        ? pageHeightCssPx
        : pageHeightCssPx - subsequentTopPadCss;
      const maxEnd = cursor + availableCss;
      if (maxEnd >= totalCssHeight) break;

      const minFill = cursor + availableCss * 0.55;
      let chosen = -1;
      for (const b of boundaries) {
        if (b > cursor + 8 && b <= maxEnd && b >= minFill) {
          chosen = b;
        }
        if (b > maxEnd) break;
      }
      const next = chosen > 0 ? chosen : maxEnd;
      pageBreaks.push(next);
      cursor = next;
      isFirstPage = false;
    }
    pageBreaks.push(totalCssHeight);

    // 4) Slice the full canvas at the chosen breakpoints and add to PDF.
    for (let i = 0; i < pageBreaks.length - 1; i++) {
      const startCss = pageBreaks[i];
      const endCss = pageBreaks[i + 1];
      const sliceCssHeight = endCss - startCss;
      const sliceCanvasHeight = Math.round(sliceCssHeight * canvasPxPerCssPx);
      const sliceCanvasY = Math.round(startCss * canvasPxPerCssPx);

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = fullCanvas.width;
      pageCanvas.height = sliceCanvasHeight;
      const ctx = pageCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        fullCanvas,
        0,
        sliceCanvasY,
        fullCanvas.width,
        sliceCanvasHeight,
        0,
        0,
        fullCanvas.width,
        sliceCanvasHeight,
      );

      const imgHeightMM = (sliceCssHeight / pxPerMM_css);
      const dataUrl = pageCanvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(dataUrl, "JPEG", 0, 0, pageWidthMM, imgHeightMM, undefined, "FAST");
    }

    return pdf.output("blob");
  } finally {
    stage.remove();
  }
}
