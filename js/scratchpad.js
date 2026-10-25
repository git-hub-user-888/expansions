// Drawing area for working. Pencil and finger both draw; a finger touching just after the
// Pencil (a resting palm) is ignored. Colours are resolved from CSS at draw time, so the
// working redraws correctly when the iPad switches between light and dark.

const COLOURS = { ink: '--ink', blue: '--ink-blue', red: '--ink-red' };
const PEN_WIDTH = 3;
const ERASER_WIDTH = 28;
const PALM_GRACE_MS = 600;

export class Scratchpad {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.items = [];       // strokes and { clear: true } markers
    this.redoStack = [];
    this.current = null;
    this.tool = 'pen';
    this.colour = 'ink';
    this.lastPenAt = -Infinity;
    this.onChange = () => {};

    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.darkQuery = matchMedia('(prefers-color-scheme: dark)');
    this.redrawBound = () => this.redraw();
    this.darkQuery.addEventListener('change', this.redrawBound);
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.darkQuery.removeEventListener('change', this.redrawBound);
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  point(e) {
    const r = this.canvas.getBoundingClientRect();
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    return { x: e.clientX - r.left, y: e.clientY - r.top, pressure };
  }

  down(e) {
    const now = performance.now();
    if (e.pointerType === 'pen') {
      this.lastPenAt = now;
      // A palm landed before the Pencil: drop its stroke.
      if (this.current?.pointerType === 'touch') {
        this.current = null;
        this.redraw();
      }
    } else if (e.pointerType === 'touch' && now - this.lastPenAt < PALM_GRACE_MS) {
      return;
    }
    if (this.current) return;
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.current = { id: e.pointerId, pointerType: e.pointerType, tool: this.tool, colour: this.colour, points: [this.point(e)] };
    this.redoStack = [];
    this.drawSegment(this.current, 0);
  }

  move(e) {
    if (e.pointerType === 'pen') this.lastPenAt = performance.now();
    const stroke = this.current;
    if (!stroke || e.pointerId !== stroke.id) return;
    const events = e.getCoalescedEvents?.() ?? [e];
    for (const ev of events.length ? events : [e]) {
      stroke.points.push(this.point(ev));
      this.drawSegment(stroke, stroke.points.length - 1);
    }
  }

  up(e) {
    if (e.pointerType === 'pen') this.lastPenAt = performance.now();
    if (!this.current || e.pointerId !== this.current.id) return;
    this.items.push(this.current);
    this.current = null;
    this.onChange();
  }

  styleFor(stroke) {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = ctx.fillStyle = '#000';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      const colour = getComputedStyle(document.documentElement).getPropertyValue(COLOURS[stroke.colour]).trim();
      ctx.strokeStyle = ctx.fillStyle = colour || '#000';
    }
  }

  width(stroke, p) {
    return stroke.tool === 'eraser' ? ERASER_WIDTH : PEN_WIDTH * (0.6 + p.pressure * 0.8);
  }

  // Draws the piece of a stroke ending at point i (a dot when i is 0).
  drawSegment(stroke, i) {
    const ctx = this.ctx;
    const p = stroke.points[i];
    this.styleFor(stroke);
    if (i === 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.width(stroke, p) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const prev = stroke.points[i - 1];
    ctx.lineWidth = this.width(stroke, p);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  redraw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
    const lastClear = this.items.findLastIndex((item) => item.clear);
    const strokes = [...this.items.slice(lastClear + 1), ...(this.current ? [this.current] : [])];
    for (const stroke of strokes) stroke.points.forEach((_, i) => this.drawSegment(stroke, i));
    ctx.globalCompositeOperation = 'source-over';
  }

  get canUndo() { return this.items.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get isBlank() {
    const lastClear = this.items.findLastIndex((item) => item.clear);
    return this.items.length - (lastClear + 1) === 0;
  }

  undo() {
    if (this.current || !this.items.length) return;
    this.redoStack.push(this.items.pop());
    this.redraw();
    this.onChange();
  }

  redo() {
    if (this.current || !this.redoStack.length) return;
    this.items.push(this.redoStack.pop());
    this.redraw();
    this.onChange();
  }

  // Clear can be undone.
  clear() {
    if (this.isBlank) return;
    this.items.push({ clear: true });
    this.redoStack = [];
    this.redraw();
    this.onChange();
  }

  // Wipe for a new question; nothing to undo back to.
  reset() {
    this.items = [];
    this.redoStack = [];
    this.current = null;
    this.redraw();
    this.onChange();
  }
}
