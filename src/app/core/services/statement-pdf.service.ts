import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';
import { CustomerStatement } from '../models/customer-statement.model';
import { formatAmountPlain } from '../utils/currency.util';
import { summarizeBalance } from '../utils/statement.util';

const PAGE_MARGIN = 15;
const HEADER_FILL: [number, number, number] = [30, 27, 75];
const STRIPE_FILL: [number, number, number] = [245, 245, 248];
const BALANCE_FILL: [number, number, number] = [235, 233, 252];
const BORDER_COLOR: [number, number, number] = [210, 210, 215];
const TEXT_COLOR: [number, number, number] = [20, 20, 20];
const MUTED_COLOR: [number, number, number] = [130, 130, 130];

/** Génère le PDF « Situation de facture client » (jsPDF chargé à la demande). */
@Injectable({ providedIn: 'root' })
export class StatementPdfService {
  async generate(statement: CustomerStatement): Promise<jsPDF> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - PAGE_MARGIN * 2;
    const currency = statement.currency;

    doc.setTextColor(...TEXT_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SITUATION DE FACTURE CLIENT', pageWidth / 2, 25, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_COLOR);
    const subtitle = statement.periodStart
      ? `Période du ${formatDate(statement.periodStart)} au ${formatDate(statement.asOf)}`
      : `Situation arrêtée au ${formatDate(statement.asOf)}`;
    doc.text(subtitle, pageWidth / 2, 32, { align: 'center' });

    const tableStartY = drawCustomer(doc, statement, 42) + 3;

    autoTable(doc, {
      startY: tableStartY,
      // Marge basse élargie pour laisser la place au numéro de page ; l'en-tête est répété sur chaque page.
      margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN + 5, left: PAGE_MARGIN, right: PAGE_MARGIN },
      theme: 'grid',
      head: [['Date', 'Désignation / Opération', `Montant (${currency})`, 'Type']],
      body: statement.lines.map(line => [
        formatDate(new Date(line.date)),
        line.label,
        formatAmountPlain(line.amount),
        line.type === 'DEBT' ? 'Dette' : 'Paiement'
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: TEXT_COLOR,
        lineColor: BORDER_COLOR,
        lineWidth: 0.2,
        cellPadding: { top: 2.3, bottom: 2.3, left: 2.5, right: 2.5 }
      },
      headStyles: { fillColor: HEADER_FILL, textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fillColor: [255, 255, 255] },
      didParseCell: data => {
        if (data.section === 'body' && data.row.index % 2 === 1) {
          data.cell.styles.fillColor = STRIPE_FILL;
        }
      },
      columnStyles: {
        0: { cellWidth: 26 },
        2: { cellWidth: 34, halign: 'right' },
        3: { cellWidth: 24, halign: 'center' }
      }
    });

    const balance = summarizeBalance(statement.balance);
    const totals: string[][] = [];
    if (statement.periodStart) {
      totals.push([
        `Solde antérieur au ${formatDate(statement.periodStart)}`,
        `${formatAmountPlain(statement.openingBalance)} ${currency}`
      ]);
    }
    totals.push(
      ['Total des dettes / factures', `${formatAmountPlain(statement.totalDebts)} ${currency}`],
      ['Total des paiements / versements', `${formatAmountPlain(statement.totalPayments)} ${currency}`],
      [balance.label.toUpperCase(), `${formatAmountPlain(balance.amount)} ${currency}`]
    );

    autoTable(doc, {
      startY: lastTableEndY(doc) + 5,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      theme: 'grid',
      // Les totaux restent groupés : ils passent entiers à la page suivante s'ils ne tiennent pas.
      pageBreak: 'avoid',
      body: totals,
      styles: {
        font: 'helvetica',
        fontSize: 10.5,
        fontStyle: 'bold',
        textColor: TEXT_COLOR,
        fillColor: [255, 255, 255],
        lineColor: BORDER_COLOR,
        lineWidth: 0.2,
        cellPadding: { top: 3.4, bottom: 3.4, left: 3, right: 3 }
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.64 },
        1: { halign: 'right' }
      },
      didParseCell: data => {
        if (data.row.index === totals.length - 1) {
          data.cell.styles.fillColor = BALANCE_FILL;
        }
      }
    });

    // NB + signature (~25 mm) : nouvelle page s'il ne reste pas assez de place.
    let y = lastTableEndY(doc) + 9;
    if (y + 25 > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN + 5;
    }
    y = drawNote(doc, statement, y, contentWidth);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_COLOR);
    doc.text('Signature / Cachet : ______________________________', PAGE_MARGIN, y + 10);

    drawPageNumbers(doc);

    return doc;
  }

  async download(statement: CustomerStatement): Promise<void> {
    const doc = await this.generate(statement);
    doc.save(fileName(statement));
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

/** Bloc client (nom, téléphone) aligné à gauche au-dessus du tableau. Retourne l'ordonnée sous le bloc. */
function drawCustomer(doc: jsPDF, statement: CustomerStatement, y: number): number {
  const rows: [string, string][] = [['Client :', statement.customerName]];
  if (statement.customerPhone) {
    rows.push(['Téléphone :', statement.customerPhone]);
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const labelWidth = Math.max(...rows.map(([label]) => doc.getTextWidth(label))) + 2;
  rows.forEach(([label, value], i) => {
    const rowY = y + i * 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED_COLOR);
    doc.text(label, PAGE_MARGIN, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_COLOR);
    doc.text(value, PAGE_MARGIN + labelWidth, rowY);
  });
  return y + (rows.length - 1) * 5.5;
}

/** Paragraphe « NB », avec le solde en gras à la fin. Retourne l'ordonnée sous le paragraphe. */
function drawNote(doc: jsPDF, statement: CustomerStatement, y: number, maxWidth: number): number {
  const lineHeight = 4;
  const payments =
    statement.paymentsCount === 0
      ? 'aucun versement n’est déduit'
      : statement.paymentsCount === 1
        ? `la ligne ${quoted('Paiement')} comme un versement déduit`
        : `les ${statement.paymentsCount} lignes ${quoted('Paiement')} comme des versements déduits`;
  const opening = statement.periodStart ? 'part du solde antérieur, ' : '';
  const summary = summarizeBalance(statement.balance);
  const prefix =
    `NB : Le calcul ci-dessus ${opening}considère toutes les lignes ${quoted('Dette')} comme des montants à payer et ${payments}. ` +
    summary.notePrefix;
  const amount = `${formatAmountPlain(summary.amount)} ${statement.currency}`;

  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_COLOR);
  doc.setFont('helvetica', 'normal');
  const lines: string[] = doc.splitTextToSize(prefix, maxWidth);
  lines.forEach((line, i) => doc.text(line, PAGE_MARGIN, y + i * lineHeight));

  const lastLine = lines[lines.length - 1];
  // getTextWidth ignore les espaces en bout de chaîne : on mesure l'espace entre deux caractères.
  const spaceWidth = doc.getTextWidth('x x') - doc.getTextWidth('xx');
  let x = PAGE_MARGIN + doc.getTextWidth(lastLine.trimEnd()) + spaceWidth * 1.2;
  let lastY = y + (lines.length - 1) * lineHeight;
  doc.setFont('helvetica', 'bold');
  if (x + doc.getTextWidth(amount + '.') > PAGE_MARGIN + maxWidth) {
    x = PAGE_MARGIN;
    lastY += lineHeight;
  }
  doc.text(amount, x, lastY);
  const amountWidth = doc.getTextWidth(amount);
  doc.setFont('helvetica', 'normal');
  doc.text('.', x + amountWidth, lastY);
  return lastY + lineHeight;
}

/** « Page X / N » en bas à droite, uniquement si la situation tient sur plusieurs pages. */
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

/** Guillemets français avec espaces insécables, pour qu'un retour à la ligne ne sépare pas « du mot. */
function quoted(word: string): string {
  return `« ${word} »`;
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
  return `situation-${slug || 'client'}-${iso}.pdf`;
}
