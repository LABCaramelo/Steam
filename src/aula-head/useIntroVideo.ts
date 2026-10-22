import { useEffect, useRef, useState } from "react";

type Side = "left" | "right";
type Gaze = { track: "center" | "left-arc" | "right-arc"; time: number; left: number; right: number };
const CENTER_TIME = 5.4;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smoothstep = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const neutral = (): Gaze => ({ track: "center", time: CENTER_TIME, left: 0, right: 0 });
const towardCard = (side: Side): Gaze => ({ track: side === "left" ? "left-arc" : "right-arc", time: side === "left" ? 3.1 : 1.6, left: Number(side === "left"), right: Number(side === "right") });

// Preserve the directional timeline of the original opening video.
function towardPointer(x: number, y: number, width: number, height: number): Gaze {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return neutral();
  const horizontal = clamp(x / width) * 2 - 1;
  const vertical = clamp(y / height) * 2 - 1;
  if (Math.hypot(horizontal, vertical) <= 0.08) return neutral();
  const angle = (Math.atan2(horizontal, -vertical) + Math.PI * 2) % (Math.PI * 2);
  const rightArc = angle <= Math.PI;
  const frames = rightArc ? [0, 8 / 30, 0.4, 1.6, 2.6] : [2.6, 3.1, 3.5, 4.5, 5.3];
  const position = (rightArc ? angle : angle - Math.PI) / (Math.PI / 4);
  const section = Math.min(3, Math.floor(position));
  const fraction = smoothstep(position - section);
  return {
    track: rightArc ? "right-arc" : "left-arc",
    time: frames[section] + (frames[section + 1] - frames[section]) * fraction,
    left: smoothstep(-horizontal) * smoothstep(vertical),
    right: smoothstep(horizontal) * smoothstep(vertical),
  };
}

export function useIntroVideo() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const scene = sceneRef.current;
    const video = videoRef.current;
    if (!scene || !video) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;
    let target = neutral();
    let smoothedTime = target.time;
    let track = target.track;
    let frame: number | undefined;
    let lastFrame: number | undefined;
    let lastSeek = -Infinity;
    let disposed = false;
    let failed = false;
    let seeking = video.seeking;
    let pointer: { x: number; y: number } | null = null;
    let hovered: Side | null = null;
    let focused: Side | null = null;
    let touchId: number | null = null;

    function stop() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      lastFrame = undefined;
    }
    function display() {
      const actual = video!.currentTime;
      const left = target.left * (1 - smoothstep(Math.abs(actual - 3.1) / 0.5));
      const right = target.right * (1 - smoothstep(Math.abs(actual - 1.6) / 0.5));
      scene!.style.setProperty("--gaze-left", left.toFixed(3));
      scene!.style.setProperty("--gaze-right", right.toFixed(3));
    }
    function frameTime(value: number) {
      const end = Number.isFinite(video!.duration) ? Math.max(0, video!.duration - 1 / 30) : CENTER_TIME;
      return clamp(Math.round(value * 30) / 30, 0, end);
    }
    function schedule() {
      if (disposed || failed || document.hidden || video!.readyState < 2 || frame !== undefined) return;
      frame = requestAnimationFrame(tick);
    }
    function tick(now: number) {
      frame = undefined;
      const elapsed = lastFrame === undefined ? 1000 / 60 : clamp(now - lastFrame, 0, 64);
      lastFrame = now;
      smoothedTime = reduced || track !== target.track ? target.time : smoothedTime + (target.time - smoothedTime) * (1 - 0.88 ** (elapsed / (1000 / 60)));
      track = target.track;
      const settled = Math.abs(smoothedTime - target.time) <= 0.001;
      if (settled) smoothedTime = target.time;
      display();
      const next = frameTime(smoothedTime);
      const needsSeek = Math.abs(next - video!.currentTime) >= 0.5 / 30;
      if (!seeking && !video!.seeking && needsSeek && (reduced || now - lastSeek >= 1000 / 30)) {
        seeking = true;
        lastSeek = now;
        try { video!.currentTime = next; } catch { error(); }
      }
      if (!settled || (needsSeek && !seeking)) schedule();
      else lastFrame = undefined;
    }
    function ready() {
      if (disposed || failed || video!.readyState < 2) return;
      setStatus("ready");
      schedule();
    }
    function seeked() {
      if (disposed || failed) return;
      seeking = false;
      display();
      if (Math.abs(frameTime(target.time) - video!.currentTime) >= 0.5 / 30) schedule();
    }
    function error() {
      failed = true;
      seeking = false;
      stop();
      setStatus("error");
    }
    function sideOf(node: EventTarget | null): Side | null {
      const side = node instanceof Element ? node.closest("[data-gaze-side]")?.getAttribute("data-gaze-side") : null;
      return side === "left" || side === "right" ? side : null;
    }
    function update() {
      const side = focused ?? hovered;
      const bounds = scene!.getBoundingClientRect();
      target = reduced ? neutral() : side ? towardCard(side) : pointer ? towardPointer(pointer.x - bounds.left, pointer.y - bounds.top, bounds.width, bounds.height) : neutral();
      schedule();
    }
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse" && touchId !== event.pointerId) return;
      pointer = { x: event.clientX, y: event.clientY };
      hovered = sideOf(event.target);
      update();
    }
    function down(event: PointerEvent) { if (event.pointerType !== "mouse") { touchId = event.pointerId; move(event); } }
    function up(event: PointerEvent) { if (touchId === event.pointerId) { touchId = null; reset(); } }
    function reset() { pointer = null; hovered = null; touchId = null; update(); }
    function over(event: PointerEvent) { if (event.pointerType === "mouse") move(event); }
    function out(event: PointerEvent) { if (event.pointerType === "mouse") { hovered = sideOf(event.relatedTarget); update(); } }
    function focus(event: FocusEvent) { focused = event.target instanceof Element && event.target.matches(":focus-visible") ? sideOf(event.target) : null; update(); }
    function blur() { focused = null; update(); }
    function preference() { reduced = media.matches; update(); }
    function visibility() { if (document.hidden) { reset(); stop(); } else schedule(); }

    video.addEventListener("loadeddata", ready);
    video.addEventListener("canplay", ready);
    video.addEventListener("seeked", seeked);
    video.addEventListener("error", error);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    scene.addEventListener("pointerover", over);
    scene.addEventListener("pointerout", out);
    scene.addEventListener("pointerleave", reset);
    scene.addEventListener("focusin", focus);
    scene.addEventListener("focusout", blur);
    window.addEventListener("blur", reset);
    window.addEventListener("resize", update);
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", preference);
    ready();
    return () => {
      disposed = true;
      stop();
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("canplay", ready);
      video.removeEventListener("seeked", seeked);
      video.removeEventListener("error", error);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      scene.removeEventListener("pointerover", over);
      scene.removeEventListener("pointerout", out);
      scene.removeEventListener("pointerleave", reset);
      scene.removeEventListener("focusin", focus);
      scene.removeEventListener("focusout", blur);
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", preference);
    };
  }, []);
  return { sceneRef, videoRef, status };
}
