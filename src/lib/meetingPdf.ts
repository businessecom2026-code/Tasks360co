/**
 * Meeting Summary PDF Generator
 *
 * Gera PDF com header (logo Ecom360.co), corpo (resumo IA) e
 * footer (disclaimer Task360 IA + paginação).
 *
 * Usa jsPDF standalone — sem dependência de html2canvas.
 */

import { jsPDF } from 'jspdf';
import type { Meeting } from '../types';

// ─── Layout constants (mm) ──────────────────────────────────────────

const MARGIN_X = 15;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 15;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

// ─── Colors ─────────────────────────────────────────────────────────

const COLOR_PRIMARY = [16, 185, 129] as const;   // emerald-500
const COLOR_TEXT = [30, 30, 30] as const;
const COLOR_GRAY = [120, 120, 120] as const;
const COLOR_LIGHT = [200, 200, 200] as const;

// ─── Logo (inline SVG-like text approach — no external fetch) ───────

function drawHeader(doc: jsPDF, y: number): number {
  // Brand circle
  doc.setFillColor(...COLOR_PRIMARY);
  doc.circle(MARGIN_X + 5, y + 3, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('E', MARGIN_X + 3.3, y + 4.5);

  // Brand name
  doc.setTextColor(...COLOR_PRIMARY);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Ecom360.co', MARGIN_X + 13, y + 5.5);

  // Tagline
  doc.setTextColor(...COLOR_GRAY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Task Management Platform', MARGIN_X + 13, y + 10);

  // Right side: generation date
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY);
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(dateStr, PAGE_WIDTH - MARGIN_X, y + 5.5, { align: 'right' });

  // Separator line
  const lineY = y + 16;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, lineY, PAGE_WIDTH - MARGIN_X, lineY);

  return lineY + 8;
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = pageHeight - MARGIN_BOTTOM;

  // Separator
  doc.setDrawColor(...COLOR_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y - 4, PAGE_WIDTH - MARGIN_X, y - 4);

  // Disclaimer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLOR_GRAY);
  doc.text('Gerada pela Task360 IA', PAGE_WIDTH / 2, y, { align: 'center' });

  // Page number
  doc.setFont('helvetica', 'normal');
  doc.text(`${pageNum} / ${totalPages}`, PAGE_WIDTH - MARGIN_X, y, { align: 'right' });
}

function addPageIfNeeded(doc: jsPDF, y: number, requiredSpace: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - MARGIN_BOTTOM - 10;

  if (y + requiredSpace > maxY) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

// ─── Main export ────────────────────────────────────────────────────

export function generateMeetingPdf(meeting: Meeting): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  // ── Header ──
  let y = drawHeader(doc, MARGIN_TOP);

  // ── Meeting title ──
  doc.setTextColor(...COLOR_TEXT);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(meeting.title, CONTENT_WIDTH);
  doc.text(titleLines, MARGIN_X, y);
  y += titleLines.length * 6 + 2;

  // ── Metadata row ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_GRAY);

  const meta: string[] = [];
  if (meeting.date) meta.push(`Data: ${meeting.date}`);
  if (meeting.time) meta.push(`Hora: ${meeting.time}`);
  if (meeting.platform) meta.push(`Plataforma: ${meeting.platform}`);
  if (meeting.participants?.length) {
    meta.push(`Participantes: ${meeting.participants.join(', ')}`);
  }

  if (meta.length > 0) {
    const metaText = meta.join('  |  ');
    const metaLines = doc.splitTextToSize(metaText, CONTENT_WIDTH);
    doc.text(metaLines, MARGIN_X, y);
    y += metaLines.length * 5 + 6;
  }

  // ── Summary section ──
  if (meeting.summary) {
    y = addPageIfNeeded(doc, y, 20);

    // Section header
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.roundedRect(MARGIN_X, y - 4, CONTENT_WIDTH, 10, 2, 2, 'F');
    doc.setTextColor(...COLOR_PRIMARY);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo da Reuniao (IA)', MARGIN_X + 4, y + 2);
    y += 12;

    // Summary body
    doc.setTextColor(...COLOR_TEXT);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const summaryLines = doc.splitTextToSize(meeting.summary, CONTENT_WIDTH - 4);

    for (const line of summaryLines) {
      y = addPageIfNeeded(doc, y, 6);
      doc.text(line, MARGIN_X + 2, y);
      y += 5;
    }

    y += 4;
  }

  // ── Suggested tasks section ──
  if (meeting.suggestedTasks && meeting.suggestedTasks.length > 0) {
    y = addPageIfNeeded(doc, y, 20);

    // Section header
    doc.setFillColor(239, 246, 255); // blue-50
    doc.roundedRect(MARGIN_X, y - 4, CONTENT_WIDTH, 10, 2, 2, 'F');
    doc.setTextColor(59, 130, 246); // blue-500
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Tarefas Sugeridas pela IA', MARGIN_X + 4, y + 2);
    y += 14;

    doc.setTextColor(...COLOR_TEXT);
    doc.setFontSize(10);

    for (let i = 0; i < meeting.suggestedTasks.length; i++) {
      const task = meeting.suggestedTasks[i];
      y = addPageIfNeeded(doc, y, 8);

      // Bullet
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.`, MARGIN_X + 2, y);

      // Task title
      doc.setFont('helvetica', 'normal');
      const taskLines = doc.splitTextToSize(task.title, CONTENT_WIDTH - 14);
      doc.text(taskLines, MARGIN_X + 10, y);
      y += taskLines.length * 5;

      // Deadline
      if (task.deadline) {
        doc.setTextColor(...COLOR_GRAY);
        doc.setFontSize(9);
        doc.text(`Prazo: ${task.deadline}`, MARGIN_X + 10, y);
        doc.setTextColor(...COLOR_TEXT);
        doc.setFontSize(10);
        y += 5;
      }

      y += 2;
    }
  }

  // ── Add footers to all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // ── Trigger download ──
  const safeName = meeting.title
    .replace(/[^a-zA-Z0-9\u00C0-\u024F ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40);
  doc.save(`Reuniao_${safeName}_${meeting.date || 'sem-data'}.pdf`);
}
