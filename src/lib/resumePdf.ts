// Shared resume → PDF renderer that breaks pages at logical section
// boundaries (elements marked with `data-pdf-section`) instead of slicing
// mid-paragraph. Falls back to single-canvas slicing if no sections found.

export async function renderResumePdfBlob(sourceEl: HTMLElement): Promise<Blob> {
  await (document as any).fonts?.ready?.catch?.(() => undefined);

  // Stage the resume off-screen at a fixed A4 width so mobile renders
  // identically to desktop.
  const A4_CSS_WIDTH = 794; // ≈ 210mm at 96dpi
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
    const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Outer padding already baked into the resume layout, so use a small
    // vertical safety margin only.
    const MARGIN_TOP_MM = 0;
    const MARGIN_BOTTOM_MM = 0;
    const usablePageHeight = pageHeight - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;

    const sections = Array.from(
      clone.querySelectorAll<HTMLElement>("[data-pdf-section]")
    );

    const captureToImage = async (el: HTMLElement) => {
      const cssWidth = A4_CSS_WIDTH;
      const cssHeight = Math.max(el.scrollHeight, el.getBoundingClientRect().height);
      const canvas = await html2canvas(el, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 0,
        width: cssWidth,
        height: cssHeight,
        windowWidth: cssWidth,
        windowHeight: cssHeight,
        ignoreElements: (node) => node instanceof HTMLElement && node.dataset.noPrint === "true",
      });
      const widthMM = pageWidth;
      const heightMM = (canvas.height * widthMM) / canvas.width;
      return { dataUrl: canvas.toDataURL("image/png"), widthMM, heightMM };
    };

    // Fallback: nothing marked → behave like before (slice a single canvas).
    if (sections.length === 0) {
      const { dataUrl, widthMM, heightMM } = await captureToImage(clone);
      let heightLeft = heightMM;
      let position = 0;
      pdf.addImage(dataUrl, "PNG", 0, position, widthMM, heightMM, undefined, "SLOW");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - heightMM;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, position, widthMM, heightMM, undefined, "SLOW");
        heightLeft -= pageHeight;
      }
      return pdf.output("blob");
    }

    // Smart section-aware pagination
    let currentY = MARGIN_TOP_MM;
    const SECTION_GAP_MM = 1.5;

    for (const section of sections) {
      const { dataUrl, widthMM, heightMM } = await captureToImage(section);
      const remaining = pageHeight - MARGIN_BOTTOM_MM - currentY;

      // If the section fits in remaining space → place it
      if (heightMM <= remaining) {
        pdf.addImage(dataUrl, "PNG", 0, currentY, widthMM, heightMM, undefined, "SLOW");
        currentY += heightMM + SECTION_GAP_MM;
        continue;
      }

      // If section is taller than a whole page, we have to slice it across pages
      // (rare, but possible for a huge Experience block).
      if (heightMM > usablePageHeight) {
        if (currentY > MARGIN_TOP_MM) {
          pdf.addPage();
          currentY = MARGIN_TOP_MM;
        }
        let heightLeft = heightMM;
        let position = currentY;
        pdf.addImage(dataUrl, "PNG", 0, position, widthMM, heightMM, undefined, "SLOW");
        heightLeft -= (pageHeight - position);
        while (heightLeft > 0) {
          pdf.addPage();
          position = -(heightMM - heightLeft);
          pdf.addImage(dataUrl, "PNG", 0, position, widthMM, heightMM, undefined, "SLOW");
          heightLeft -= pageHeight;
        }
        currentY = pageHeight - Math.max(0, -((heightMM - (heightMM - (pageHeight - MARGIN_TOP_MM))))); // best-effort
        // Start a fresh page for the next section to be safe
        pdf.addPage();
        currentY = MARGIN_TOP_MM;
        continue;
      }

      // Otherwise: start this section on a new page
      pdf.addPage();
      currentY = MARGIN_TOP_MM;
      pdf.addImage(dataUrl, "PNG", 0, currentY, widthMM, heightMM, undefined, "SLOW");
      currentY += heightMM + SECTION_GAP_MM;
    }

    return pdf.output("blob");
  } finally {
    stage.remove();
  }
}
