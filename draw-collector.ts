import type { Page } from 'playwright';
import { inspectDrawPage, extractDrawEntries } from './draw-parser';
import type { DrawEntry } from './draw-progress';

/**
 * Collect a complete SaddleBook draw using the authenticated browser context.
 * Never treat the first page as the complete draw. Follow same-course pagination
 * and fail closed if any page cannot be read, so alerts are never based on a
 * partial rider list.
 */
export async function collectAllDrawPages(page: Page, drawUrl: string, maxPages = 100): Promise<{
  entries: DrawEntry[];
  pageCount: number;
  duplicateDrawNumbers: number[];
}> {
  const initial = new URL(drawUrl);
  if (initial.protocol !== 'https:' || initial.hostname !== 'saddlebook.com' ||
      !/^\/events\/\d+\/courses\/\d+\/draws$/.test(initial.pathname)) {
    throw new Error('Invalid SaddleBook draw URL');
  }
  const basePath = initial.pathname;
  const pending = [initial.href];
  const seen = new Set<string>();
  const entries = new Map<number, DrawEntry>();
  const duplicates = new Set<number>();
  while (pending.length) {
    if (seen.size >= maxPages) throw new Error('Draw exceeds maximum page count; refusing incomplete import');
    const next = pending.shift()!;
    const u = new URL(next);
    if (u.origin !== initial.origin || u.pathname !== basePath) {
      throw new Error('Unexpected cross-course pagination URL');
    }
    u.searchParams.set('by_draw', 'true');
    const key = u.href;
    if (seen.has(key)) continue;
    seen.add(key);
    const response = await page.goto(key, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response?.ok()) throw new Error('Draw page fetch failed: HTTP ' + response?.status());
    if (page.url().includes('/sign_in') || await page.locator('input[type="password"]').count()) {
      throw new Error('Authenticated SaddleBook session expired during draw import');
    }
    const rows = await inspectDrawPage(page);
    const parsed = extractDrawEntries(rows);
    if (!parsed.length) throw new Error('Draw page has no parseable riders: ' + key);
    for (const entry of parsed) {
      if (entries.has(entry.drawNumber)) {
        const previous = entries.get(entry.drawNumber)!;
        if (previous.rider !== entry.rider || previous.horse !== entry.horse) {
          duplicates.add(entry.drawNumber);
        }
      } else entries.set(entry.drawNumber, entry);
    }
    const pageLinks = await page.locator('a[href]').evaluateAll(links =>
      links.map(a => (a as HTMLAnchorElement).href)
        .filter(href => { try {
          const url = new URL(href);
          return url.hostname === 'saddlebook.com' &&
            /\/events\/\d+\/courses\/\d+\/draws$/.test(url.pathname) &&
            url.searchParams.has('page');
        } catch { return false; } })
    );
    for (const link of pageLinks) {
      const p = new URL(link);
      if (p.pathname !== basePath) continue;
      p.searchParams.set('by_draw', 'true');
      if (!seen.has(p.href) && !pending.includes(p.href)) pending.push(p.href);
    }
  }
  if (duplicates.size) throw new Error('Conflicting draw numbers found: ' + [...duplicates].join(', '));
  const result = [...entries.values()].sort((a,b) => a.drawNumber - b.drawNumber);
  if (!result.length) throw new Error('No draw entries imported');
  return {entries: result, pageCount: seen.size, duplicateDrawNumbers: []};
}
