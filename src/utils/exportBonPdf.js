import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { BON_PRINT_ROOT_ID } from "./bonDocumentFormat";

const UNSUPPORTED_COLOR_PATTERNS = [
  /\boklab\(/i,
  /color-mix\(in oklab/i,
  /color-mix\(in lab, red, red\)/i,
];

function isUnsupportedColorRule(rule) {
  const cssText = rule.cssText || "";
  return UNSUPPORTED_COLOR_PATTERNS.some((pattern) => pattern.test(cssText));
}

function removeUnsupportedColorRules() {
  const removedRules = [];

  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (error) {
      continue;
    }
    if (!rules) continue;

    for (let i = rules.length - 1; i >= 0; i -= 1) {
      const rule = rules[i];
      if (isUnsupportedColorRule(rule)) {
        removedRules.push({ sheet, index: i, cssText: rule.cssText });
        try {
          sheet.deleteRule(i);
        } catch (deleteError) {
          // ignore rules we can't delete
        }
      }
    }
  }

  return removedRules;
}

function restoreRemovedRules(removedRules) {
  for (let i = removedRules.length - 1; i >= 0; i -= 1) {
    const { sheet, index, cssText } = removedRules[i];
    try {
      sheet.insertRule(cssText, index);
    } catch (insertError) {
      // ignore failures when restoring unsupported rules
    }
  }
}

/**
 * PDF = capture écran, redimensionné sur **une seule page A4**.
 */
export async function exportBonPdf(filename = "bon-commande") {
  const el = document.getElementById(BON_PRINT_ROOT_ID);
  if (!el) {
    throw new Error(
      "Document non visible. Validez le bon ou ouvrez l’aperçu avant de télécharger le PDF.",
    );
  }

  const hidden = el.querySelectorAll(".bon-no-pdf");
  hidden.forEach((n) => n.classList.add("hidden"));
  const removedRules = removeUnsupportedColorRules();

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: el.offsetWidth,
      height: el.offsetHeight,
    });

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    let imgW = maxW;
    let imgH = (canvas.height * imgW) / canvas.width;

    if (imgH > maxH) {
      imgH = maxH;
      imgW = (canvas.width * imgH) / canvas.height;
    }

    const x = (pageW - imgW) / 2;
    const y = margin;

    pdf.addImage(imgData, "PNG", x, y, imgW, imgH);

    const safeName = String(filename).replace(/[^\w.-]+/g, "_");
    try {
      pdf.save(`${safeName}.pdf`);
    } catch (saveError) {
      const pdfBlob = pdf.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }
  } finally {
    hidden.forEach((n) => n.classList.remove("hidden"));
    restoreRemovedRules(removedRules);
  }
}
