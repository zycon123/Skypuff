export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.leftPressed = false;
        this.rightPressed = false;
        this.touchActive = false;
        this.touchX = 0;
        this.playerX = 0;
        this.enabled = true;

        this.keydownHandler = (e) => this.onKeyDown(e);
        this.keyupHandler = (e) => this.onKeyUp(e);
        this.touchstartHandler = (e) => this.onTouchStart(e);
        this.touchmoveHandler = (e) => this.onTouchMove(e);
        this.touchendHandler = (e) => this.onTouchEnd(e);
        this.mousedownHandler = (e) => this.onMouseDown(e);
        this.mousemoveHandler = (e) => this.onMouseMove(e);
        this.mouseupHandler = (e) => this.onMouseUp(e);

        this.attach();
    }

    attach() {
        window.addEventListener('keydown', this.keydownHandler);
        window.addEventListener('keyup', this.keyupHandler);
        this.canvas.addEventListener('touchstart', this.touchstartHandler, { passive: false });
        this.canvas.addEventListener('touchmove', this.touchmoveHandler, { passive: false });
        this.canvas.addEventListener('touchend', this.touchendHandler);
        this.canvas.addEventListener('mousedown', this.mousedownHandler);
        window.addEventListener('mousemove', this.mousemoveHandler);
        window.addEventListener('mouseup', this.mouseupHandler);
    }

    detach() {
        window.removeEventListener('keydown', this.keydownHandler);
        window.removeEventListener('keyup', this.keyupHandler);
        this.canvas.removeEventListener('touchstart', this.touchstartHandler);
        this.canvas.removeEventListener('touchmove', this.touchmoveHandler);
        this.canvas.removeEventListener('touchend', this.touchendHandler);
        this.canvas.removeEventListener('mousedown', this.mousedownHandler);
        window.removeEventListener('mousemove', this.mousemoveHandler);
        window.removeEventListener('mouseup', this.mouseupHandler);
    }

    onKeyDown(e) {
        if (!this.enabled) return;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            this.leftPressed = true;
            e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            this.rightPressed = true;
            e.preventDefault();
        }
    }

    onKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            this.leftPressed = false;
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            this.rightPressed = false;
        }
    }

    onTouchStart(e) {
        if (!this.enabled) return;
        e.preventDefault();
        this.touchActive = true;
        this.touchX = e.touches[0].clientX;
    }

    onTouchMove(e) {
        if (!this.enabled) return;
        e.preventDefault();
        if (this.touchActive) {
            this.touchX = e.touches[0].clientX;
        }
    }

    onTouchEnd(e) {
        this.touchActive = false;
    }

    onMouseDown(e) {
        if (!this.enabled) return;
        this.touchActive = true;
        this.touchX = e.clientX;
    }

    onMouseMove(e) {
        if (this.touchActive) {
            this.touchX = e.clientX;
        }
    }

    onMouseUp(e) {
        this.touchActive = false;
    }

    setPlayerX(x) {
        this.playerX = x;
    }

    getDirection() {
        if (this.leftPressed) return -1;
        if (this.rightPressed) return 1;
        
        if (this.touchActive) {
            const rect = this.canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const diff = this.touchX - centerX;
            
            if (Math.abs(diff) < 30) return 0;
            return diff > 0 ? 1 : -1;
        }
        
        return 0;
    }

    reset() {
        this.leftPressed = false;
        this.rightPressed = false;
        this.touchActive = false;
    }
}
