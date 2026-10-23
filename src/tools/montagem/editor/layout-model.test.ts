import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PANELS, fitPanels, panelBounds, panelPreferences } from './layout-model.ts';

const desktop = { width: 1440, height: 810, rail: 56, chrome: 78, drawerVisible: true, inspectorVisible: true };

test('restored large panels leave room for the preview when the embedded workspace shrinks', () => {
  for (const width of [841, 1024, 1440]) {
    const layout = fitPanels({ drawer: 480, inspector: 440, timeline: 600 }, { ...desktop, width });
    assert.ok(layout.drawer + layout.inspector + 56 + 12 + 220 <= width);
    assert.ok(layout.timeline <= 810 - 78 - 6 - 160);
    assert.ok(layout.drawer >= 160);
    assert.ok(layout.inspector >= 200);
  }
});

test('a hidden inspector does not consume the preview budget', () => {
  const viewport = { ...desktop, width: 600, inspectorVisible: false };
  const layout = fitPanels({ drawer: 480, inspector: 440, timeline: 270 }, viewport);
  assert.ok(layout.drawer + viewport.rail + 6 + 220 <= viewport.width);
  assert.equal(layout.inspector, 440);
  assert.equal(panelBounds('drawer', layout, viewport)[1], 318);
});

test('restoring preferences rejects nonnumeric, nonfinite, zero and negative values', () => {
  for (const invalid of [null, [], { drawer: '300', inspector: NaN, timeline: -1 }, { drawer: Infinity, timeline: 0 }]) {
    assert.deepEqual(panelPreferences(invalid), DEFAULT_PANELS);
  }
});

test('panel limits remain valid in a short viewport and preserve both vertical areas', () => {
  const viewport = { ...desktop, height: 370 };
  const layout = fitPanels({ ...DEFAULT_PANELS, timeline: 900 }, viewport);
  const [min, max] = panelBounds('timeline', layout, viewport);
  assert.ok(min >= 0 && max >= min);
  assert.ok(layout.timeline >= min && layout.timeline <= max);
  assert.ok(viewport.height - viewport.chrome - 6 - layout.timeline >= 140);
});

test('fitting for a smaller window does not overwrite the stored desktop preference', () => {
  const preferred = { drawer: 410, inspector: 390, timeline: 400 };
  fitPanels(preferred, { ...desktop, width: 841, height: 500 });
  assert.deepEqual(preferred, { drawer: 410, inspector: 390, timeline: 400 });
  assert.deepEqual(fitPanels(preferred, { ...desktop, width: 1800 }), preferred);
});
