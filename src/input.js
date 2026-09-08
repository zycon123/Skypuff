// input.js — keyboard, touch-drag and pointer input, normalized to an axis in [-1, 1]
export class InputManager {
  constructor(target) {
    this.target = target;
    this.axis = 0; // current horizontal intent
    this._keys = new Set();
    this._dragActive = false;
    this._dragStartX = 0;
    this._dragCurrentX = 0;
    this._dragOriginAxis = 0;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this._attached = false;
  }

  attach() {
    if (this._attached) return; // guard against duplicate listeners on restart
    this._attached = true;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.target.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
    // Prevent scrolling/pull-to-refresh while dragging on the canvas.
    this.target.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.target.addEventListener('contextmenu', this._onContextMenu);
  }

  detach() {
    if (!this._attached) return;
    this._attached = false;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.target.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
    this.target.removeEventListener('touchmove', this._onTouchMove);
    this.target.removeEventListener('contextmenu', this._onContextMenu);
  }

  _onKeyDown(e) {
    if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) e.preventDefault();
    this._keys.add(e.key.toLowerCase());
  }

  _onKeyUp(e) {
    this._keys.delete(e.key.toLowerCase());
  }

  _onPointerDown(e) {
    this._dragActive = true;
    this._dragStartX = e.clientX;
    this._dragCurrentX = e.clientX;
    if (this.target.setPointerCapture) {
      try { this.target.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
  }

  _onPointerMove(e) {
    if (!this._dragActive) return;
    this._dragCurrentX = e.clientX;
  }

  _onPointerUp() {
    this._dragActive = false;
  }

  _onTouchMove(e) {
    e.preventDefault();
  }

  // Returns axis in [-1, 1] combining keyboard + drag input.
  update() {
    let axis = 0;
    if (this._keys.has('arrowleft') || this._keys.has('a')) axis -= 1;
    if (this._keys.has('arrowright') || this._keys.has('d')) axis += 1;

    if (this._dragActive) {
      const dx = this._dragCurrentX - this._dragStartX;
      const DEAD_ZONE = 6;
      const RANGE = 70; // px of drag to reach full intent
      if (Math.abs(dx) > DEAD_ZONE) {
        const sign = dx > 0 ? 1 : -1;
        const mag = Math.min(1, (Math.abs(dx) - DEAD_ZONE) / RANGE);
        axis = sign * mag;
      }
    }
    this.axis = axis;
    return axis;
  }
}
