// Scene Transitions Engine
export class TransitionsEngine {
  constructor() {
    this.type = 'fade'; // 'cut', 'fade', 'slide'
    this.duration = 300; // ms
    this.isTransitioning = false;
    this.progress = 0; // 0 to 1
    this.startTime = 0;
    this.fromScene = null;
    this.toScene = null;
    this.onComplete = null;
  }

  /** @param {(() => void) | null} [onComplete] */
  startTransition(fromScene, toScene, type = this.type, duration = this.duration, onComplete = null) {
    if (type === 'cut' || duration <= 0) {
      this.progress = 1;
      this.isTransitioning = false;
      if (onComplete) onComplete();
      return;
    }

    this.type = type;
    this.duration = duration;
    this.fromScene = fromScene;
    this.toScene = toScene;
    this.isTransitioning = true;
    this.progress = 0;
    this.startTime = performance.now();
    this.onComplete = onComplete;
  }

  update(currentTime) {
    if (!this.isTransitioning) return;

    const elapsed = currentTime - this.startTime;
    this.progress = Math.min(1.0, elapsed / this.duration);

    if (this.progress >= 1.0) {
      this.isTransitioning = false;
      if (this.onComplete) {
        this.onComplete();
        this.onComplete = null;
      }
    }
  }

  setManualProgress(p, fromScene, toScene) {
    this.isTransitioning = true;
    this.progress = Math.max(0, Math.min(1, p));
    this.fromScene = fromScene;
    this.toScene = toScene;
  }

  renderTransition(ctx, width, height, currentTime, renderSceneFn) {
    if (!this.isTransitioning || this.progress >= 1.0) {
      renderSceneFn(ctx, this.toScene || this.fromScene, currentTime);
      return;
    }

    const p = this.progress;

    if (this.type === 'fade') {
      // 1. Render From Scene
      ctx.save();
      ctx.globalAlpha = 1.0 - p;
      renderSceneFn(ctx, this.fromScene, currentTime);
      ctx.restore();

      // 2. Render To Scene
      ctx.save();
      ctx.globalAlpha = p;
      renderSceneFn(ctx, this.toScene, currentTime);
      ctx.restore();
    } else if (this.type === 'slide') {
      // Slide Left
      ctx.save();
      ctx.translate(-width * p, 0);
      renderSceneFn(ctx, this.fromScene, currentTime);
      ctx.restore();

      ctx.save();
      ctx.translate(width * (1.0 - p), 0);
      renderSceneFn(ctx, this.toScene, currentTime);
      ctx.restore();
    } else {
      // Fallback Cut
      renderSceneFn(ctx, p < 0.5 ? this.fromScene : this.toScene, currentTime);
    }
  }
}
