import type { Page } from 'playwright';
import type { DrawEntry } from './draw-progress';

/** Diagnostic extractor: captures row styling, not just text. The exact
 * completed-row signal must be confirmed against a live SaddleBook page. */
export async function inspectDrawPage(page: Page) {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr, [role="row"]'))
      .filter(el => (el as HTMLElement).innerText.trim().length > 0);
    return rows.map((el, index) => {
      const cells = Array.from(el.querySelectorAll('td,[role="cell"]'));
      const background = getComputedStyle(el).backgroundColor;
      const className = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
      return {
        index,
        text: (el as HTMLElement).innerText.trim().slice(0,400),
        cells: cells.map(c => (c as HTMLElement).innerText.trim()),
        className,
        background,
        cellStyles: cells.map(c => ({
          className: typeof (c as HTMLElement).className === 'string' ? (c as HTMLElement).className : '',
          background: getComputedStyle(c).backgroundColor
        }))
      };
    });
  });
}
export type InspectedRow = Awaited<ReturnType<typeof inspectDrawPage>>[number];
export function greenCompletion(row: InspectedRow): boolean {
  // Only treat explicit green class names as evidence. Color values require
  // live validation to avoid mistaking alternating or decorative row colors.
  const classes = [row.className, ...row.cellStyles.map(c => c.className)].join(' ');
  return /(?:^|\\s)(?:bg-success|table-success|completed|is-complete|finished)(?:\\s|$)/i.test(classes);
}
export function extractDrawEntries(rows: InspectedRow[]): DrawEntry[] {
  return rows.flatMap((row, i) => {
    const first = row.cells[0] || '';
    const drawNumber = Number(first.replace(/[^0-9]/g, ''));
    if (!Number.isSafeInteger(drawNumber) || drawNumber <= 0 || row.cells.length < 2) return [];
    return [{
      id: String(drawNumber) + ':' + i,
      drawNumber,
      rider: row.cells[1] || 'Unknown',
      horse: row.cells[2] || undefined,
      completed: greenCompletion(row),
      scratched: /\\bscratch(?:ed)?\\b/i.test(row.text)
    }];
  });
}
