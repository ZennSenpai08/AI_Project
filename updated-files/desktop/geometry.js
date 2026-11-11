export function recoverBounds(saved, displays, size = { width: 340, height: 480 }) {
  const areas = displays.map(d => d.workArea);
  const valid = saved && [saved.x, saved.y, saved.width, saved.height].every(Number.isFinite);
  const area = (valid && areas.find(a => saved.x + saved.width / 2 >= a.x && saved.x + saved.width / 2 < a.x + a.width && saved.y + saved.height / 2 >= a.y && saved.y + saved.height / 2 < a.y + a.height)) || areas[0];
  const width = Math.min(size.width, area.width), height = Math.min(size.height, area.height);
  return { x: Math.round(Math.max(area.x, Math.min(area.x + area.width - width, valid ? saved.x : area.x + area.width - width - 24))),
    y: Math.round(Math.max(area.y, Math.min(area.y + area.height - height, valid ? saved.y : area.y + area.height - height - 24))), width, height };
}
export class DragTracker {
  begin(cursor, bounds) { this.start = { cursor, bounds }; this.dragged = false; }
  move(cursor) { if (!this.start) return null; const dx = cursor.x - this.start.cursor.x, dy = cursor.y - this.start.cursor.y;
    if (Math.hypot(dx, dy) > 6) this.dragged = true;
    return this.dragged ? { x: this.start.bounds.x + dx, y: this.start.bounds.y + dy } : null; }
  end() { const click = Boolean(this.start && !this.dragged); this.start = null; return click; }
}
export function registerRestore(shortcuts, previous, next, callback) {
  if (typeof next !== 'string' || next.length > 80 || !/^(?:(?:CommandOrControl|Control|Ctrl|Alt|Shift|Super)\+){1,3}(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/i.test(next)) return { ok: false, error: 'Use modifiers plus a letter, number or function key, for example Ctrl+Alt+C.' };
  if (next === previous && shortcuts.isRegistered(next)) return { ok: true };
  try { if (!shortcuts.register(next, callback)) return { ok: false, error: 'That shortcut is already in use. The previous shortcut remains active.' }; }
  catch { return { ok: false, error: 'Windows could not register that shortcut.' }; }
  if (previous && previous !== next) shortcuts.unregister(previous);
  return { ok: true };
}
