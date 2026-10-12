import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';
import { CustomerStatement } from '../models/customer-statement.model';
import { formatAmountPlain } from '../utils/currency.util';
import { ledgerRows, statementStart, summarizeBalance } from '../utils/statement.util';

type Rgb = [number, number, number];

const PAGE_MARGIN = 15;
const NAVY: Rgb = [31, 56, 100];
const WHITE: Rgb = [255, 255, 255];
const PAYMENT_FILL: Rgb = [239, 246, 240];
const PAYMENT_TEXT: Rgb = [46, 125, 50];
const TOTALS_FILL: Rgb = [230, 233, 241];
const BORDER_COLOR: Rgb = [200, 205, 215];
const TEXT_COLOR: Rgb = [20, 20, 20];
const MUTED_COLOR: Rgb = [130, 130, 130];
const SUMMARY_WIDTH = 112;
/** Côté maximal du cachet sur le PDF (mm). */
const STAMP_MAX_MM = 38;

/** Génère le PDF « Relevé de compte client » (jsPDF chargé à la demande). */
@Injectable({ providedIn: 'root' })
export class StatementPdfService {
  async generate(statement: CustomerStatement): Promise<jsPDF> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const money = (value: number) => `${formatAmountPlain(value)} ${statement.currency}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...NAVY);
    doc.text('RELEVÉ DE COMPTE CLIENT', pageWidth / 2, 24, { align: 'center' });

    const tableStartY = drawHeader(doc, statement, 34) + 6;

    const rows = ledgerRows(statement);
    autoTable(doc, {
      startY: tableStartY,
      // Marge basse élargie pour laisser la place au numéro de page ; l'en-tête est répété sur chaque page.
      margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN + 5, left: PAGE_MARGIN, right: PAGE_MARGIN },
      theme: 'grid',
      head: [['Date', 'Désignation', 'Débit (dette)', 'Crédit (paiement)', 'Solde']],
      body: rows.map(row => [
        row.date ? formatDate(new Date(row.date)) : '',
        row.label,
        row.debit === null ? '' : money(row.debit),
        row.credit === null ? '' : money(row.credit),
        money(row.balance)
      ]),
      foot: [['', 'TOTAUX', money(statement.totalDebts), money(statement.totalPayments), money(statement.balance)]],
      showFoot: 'lastPage',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: TEXT_COLOR,
        lineColor: BORDER_COLOR,
        lineWidth: 0.2,
        valign: 'middle',
        cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 }
      },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' },
      bodyStyles: { fillColor: WHITE },
      footStyles: { fillColor: TOTALS_FILL, textColor: TEXT_COLOR, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 22 },
        2: { cellWidth: 29, halign: 'right' },
        3: { cellWidth: 31, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      didParseCell: data => {
        if (data.column.index >= 2) {
          data.cell.styles.halign = 'right';
        }
        if (data.section !== 'body') {
          return;
        }
        const row = rows[data.row.index];
        if (row.opening) {
          data.cell.styles.fontStyle = 'italic';
        } else if (row.credit !== null) {
          data.cell.styles.fillColor = PAYMENT_FILL;
          if (data.column.index === 3) {
            data.cell.styles.textColor = PAYMENT_TEXT;
          }
        }
      }
    });

    const balance = summarizeBalance(statement.balance);
    const summary: string[][] = [];
    if (statement.periodStart) {
      summary.push(['Solde antérieur', money(statement.openingBalance)]);
    }
    summary.push(
      ['Total des achats (dettes)', money(statement.totalDebts)],
      ['Total des versements', money(statement.totalPayments)],
      [balance.label.toUpperCase(), money(balance.amount)]
    );

    autoTable(doc, {
      startY: lastTableEndY(doc) + 8,
      margin: { left: pageWidth - PAGE_MARGIN - SUMMARY_WIDTH, right: PAGE_MARGIN },
      theme: 'plain',
      // Le récapitulatif reste groupé : il passe entier à la page suivante s'il ne tient pas.
      pageBreak: 'avoid',
      tableLineColor: NAVY,
      tableLineWidth: 0.3,
      body: summary,
      styles: {
        font: 'helvetica',
        fontSize: 9.5,
        textColor: TEXT_COLOR,
        cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 }
      },
      columnStyles: { 1: { halign: 'right' } },
      didParseCell: data => {
        if (data.row.index === summary.length - 1) {
          data.cell.styles.fillColor = NAVY;
          data.cell.styles.textColor = WHITE;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 11.5;
        }
      }
    });

    // Cachet du commerce (Paramètres) apposé sous la mention, sinon une ligne à signer à la main.
    const stamp = statement.stampImage ? stampSize(doc, statement.stampImage) : null;
    let y = lastTableEndY(doc) + (stamp ? 14 : 20);
    if (y + (stamp ? stamp.height + 4 : 0) > pageHeight - PAGE_MARGIN - 5) {
      doc.addPage();
      y = PAGE_MARGIN + 10;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_COLOR);
    if (stamp) {
      doc.text('Signature et cachet :', PAGE_MARGIN + 2, y);
      doc.addImage(statement.stampImage!, 'PNG', PAGE_MARGIN + 6, y + 3, stamp.width, stamp.height);
    } else {
      doc.text('Signature et cachet : ______________________', PAGE_MARGIN + 2, y);
    }

    drawPageNumbers(doc);

    return doc;
  }

  async download(statement: CustomerStatement): Promise<void> {
    const doc = await this.generate(statement);
    doc.save(fileName(statement));
  }

  /** Vrai si le navigateur sait partager un fichier PDF (feuille de partage native, surtout sur mobile). */
  canShareFiles(): boolean {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      return false;
    }
    const probe = new File([''], 'releve.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [probe] });
  }

  /**
   * Partage le PDF via la feuille de partage native (WhatsApp, Telegram… sur mobile).
   * Retourne 'unsupported' si le navigateur ne sait pas partager de fichier (desktop) : à l'appelant de prévoir un repli.
   */
  async share(statement: CustomerStatement, text: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
    if (!this.canShareFiles()) {
      return 'unsupported';
    }
    const doc = await this.generate(statement);
    const file = new File([doc.output('blob')], fileName(statement), { type: 'application/pdf' });
    if (!navigator.canShare({ files: [file] })) {
      return 'unsupported';
    }
    try {
      await navigator.share({ files: [file], title: 'Relevé de compte', text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // NotAllowedError : l'activation utilisateur a expiré pendant la génération du PDF.
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        return 'unsupported';
      }
      throw err;
    }
  }

  /** Ouvre le PDF dans un nouvel onglet (visionneuse du navigateur). Repli : téléchargement si l'onglet est bloqué. */
  async open(statement: CustomerStatement): Promise<void> {
    // L'onglet est ouvert avant l'attente : après un `await`, le navigateur le bloquerait comme pop-up.
    const tab = window.open('', '_blank');
    try {
      const doc = await this.generate(statement);
      if (!tab || tab.closed) {
        doc.save(fileName(statement));
        return;
      }
      const url = URL.createObjectURL(doc.output('blob'));
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      throw err;
    }
  }
}

/**
 * En-tête sur deux colonnes : Client / Période (+ Téléphone) à gauche, Date d'édition / Devise à droite.
 * Retourne l'ordonnée de la dernière ligne.
 */
function drawHeader(doc: jsPDF, statement: CustomerStatement, y: number): number {
  const start = statementStart(statement);
  const period = start ? `${formatDate(start)} au ${formatDate(statement.asOf)}` : 'Aucune opération';
  const left: [string, string][] = [
    ['Client :', statement.customerName],
    ['Période :', period]
  ];
  if (statement.customerPhone) {
    left.push(['Téléphone :', statement.customerPhone]);
  }
  const right: [string, string][] = [
    ["Date d'édition :", formatDate(new Date())],
    ['Devise :', statement.currency]
  ];

  const lineHeight = 7;
  drawColumn(doc, left, PAGE_MARGIN + 10, y, lineHeight);
  drawColumn(doc, right, 112, y, lineHeight);
  return y + (Math.max(left.length, right.length) - 1) * lineHeight;
}

/** Libellés en gras alignés à droite, valeurs alignées à gauche juste après. */
function drawColumn(doc: jsPDF, rows: [string, string][], x: number, y: number, lineHeight: number): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const labelWidth = Math.max(...rows.map(([label]) => doc.getTextWidth(label)));
  rows.forEach(([label, value], i) => {
    const rowY = y + i * lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_COLOR);
    doc.text(label, x + labelWidth, rowY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(value, x + labelWidth + 9, rowY);
  });
}

/** « Page X / N » en bas à droite, uniquement si le relevé tient sur plusieurs pages. */
function drawPageNumbers(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  if (pageCount < 2) {
    return;
  }
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.text(`Page ${page} / ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 8, { align: 'right' });
  }
}

/** Taille du cachet sur la page (mm), proportions conservées, dans un carré de STAMP_MAX_MM. */
function stampSize(doc: jsPDF, dataUrl: string): { width: number; height: number } | null {
  try {
    const { width, height } = doc.getImageProperties(dataUrl);
    const ratio = Math.min(STAMP_MAX_MM / width, STAMP_MAX_MM / height);
    return { width: width * ratio, height: height * ratio };
  } catch {
    // Image illisible : on garde la ligne de signature plutôt que d'échouer.
    return null;
  }
}

function lastTableEndY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fileName(statement: CustomerStatement): string {
  const slug = statement.customerName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const d = statement.asOf;
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `releve-${slug || 'client'}-${iso}.pdf`;
}
