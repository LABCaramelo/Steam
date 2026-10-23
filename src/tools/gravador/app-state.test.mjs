import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppState } from './app-state.js';
import { SourceItem } from './sources/source-item.js';
import { AudioFiltersDialog } from './ui/dialogs/audio-filters-dialog.js';

function fixture(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const saved = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage; });
  const compositor = {
    isStudioMode: false, transitions: { isTransitioning: false }, selectedSource: null,
    selectSource(source) { this.selectedSource = source; }, setStudioMode(enabled) { this.isStudioMode = enabled; }
  };
  const removed = [];
  const state = new AppState(compositor, { audioEngine: { removeSourceAudio: id => removed.push(id) } }, { storageKey: 'test:no-ar:alice' });
  return { state, compositor, saved, removed };
}

test('studio edits preview and commits program exactly once, then restores the prior program to preview', async t => {
  const { state, compositor } = fixture(t); await state.initDefaultSetup();
  const program = state.currentScene;
  state.setStudioMode(true);
  const preview = state.addScene('Prévia');
  const source = new SourceItem({ type: 'text' }); state.addSource(source);
  assert.equal(state.currentScene, program);
  assert.equal(state.editingScene, preview);
  assert.deepEqual(program.sources, []);
  assert.deepEqual(preview.sources, [source]);
  assert.equal(compositor.activeScene, program);
  assert.equal(compositor.previewScene, preview);
  assert.equal(state.commitTransition(program, preview), true);
  assert.equal(state.currentScene, preview);
  assert.equal(state.previewScene, program);
  assert.equal(compositor.selectedSource, null);
  assert.equal(state.commitTransition(program, preview), false);
});

test('leaving studio clears preview selection and targets the program for source changes', async t => {
  const { state, compositor } = fixture(t); await state.initDefaultSetup();
  const program = state.currentScene; state.setStudioMode(true);
  state.addScene('Outra cena'); state.addSource(new SourceItem());
  state.setStudioMode(false);
  assert.equal(state.editingScene, program); assert.equal(compositor.selectedSource, null);
  const source = new SourceItem(); state.addSource(source); state.addSource(source);
  assert.deepEqual(program.sources, [source]);
});

test('scene selection and removal cannot invalidate an active transition', async t => {
  const { state, compositor } = fixture(t); await state.initDefaultSetup();
  const first = state.currentScene; const second = state.addScene('Segunda');
  state.setStudioMode(true); state.setPreviewScene(first);
  compositor.transitions.isTransitioning = true;
  state.setCurrentScene(second); state.setPreviewScene(second); state.removeCurrentScene();
  assert.equal(state.scenes.length, 2); assert.equal(state.previewScene, first); assert.equal(state.currentScene, second);
  compositor.transitions.isTransitioning = false;
  state.removeCurrentScene(); assert.equal(state.previewScene, second); assert.equal(state.currentScene, second);
  assert.equal(state.commitTransition(second, second), false);
});

test('deleting sources and replacing collections releases audio and native resources only after validation', async t => {
  const { state, compositor, removed } = fixture(t); await state.initDefaultSetup();
  let destroys = 0;
  const source = { id: 'live-source', type: 'mic', props: {}, destroy() { destroys++; } };
  state.addSource(source);
  assert.throws(() => state.importScenesJSON('{"formatVersion":2,"scenes":[]}'), /inválida/);
  assert.equal(destroys, 0); assert.deepEqual(state.currentScene.sources, [source]);
  state.importScenesJSON(JSON.stringify({ formatVersion: 2, scenes: [{ id: 'safe', name: 'Importada', sources: [] }] }));
  assert.equal(destroys, 1); assert.deepEqual(removed, ['live-source']); assert.equal(compositor.activeScene.name, 'Importada');
  state.destroy(); state.destroy(); assert.equal(compositor.activeScene, null); assert.equal(compositor.previewScene, null);
});

test('imports regenerate unsafe and duplicate IDs, bound values, and omit device or file payloads', async t => {
  const { state } = fixture(t); await state.initDefaultSetup();
  const rawSource = {
    id: 'bad"]#selector', name: '<img src=x onerror=alert(1)>', type: 'video', width: 1e9, opacity: -1, volume: 7,
    props: { objectUrl: 'blob:secret', stream: { active: true }, videoElement: {}, text: '<script>literal</script>' },
    audioFilters: [{ id: 'bad-id', type: 'gain', name: '<b>literal</b>', enabled: true, gainDb: 1e7 }, { type: 'unknown' }]
  };
  state.importScenesJSON(JSON.stringify({ formatVersion: 2, currentSceneId: 'scene_ok', scenes: [{ id: 'scene_ok', name: 'Cenas', sources: [rawSource, rawSource] }, { id: 'scene_ok', sources: [] }, { id: '123', sources: [] }] }));
  const allIds = [...state.scenes.map(scene => scene.id), ...state.scenes.flatMap(scene => scene.sources.map(source => source.id))];
  allIds.forEach(id => assert.match(id, /^[A-Za-z_][A-Za-z0-9_-]{0,99}$/));
  assert.equal(new Set(allIds).size, allIds.length);
  const source = state.currentScene.sources[0];
  assert.equal(source.name, rawSource.name); assert.equal(source.props.text, '<script>literal</script>');
  assert.equal(source.width, 8192); assert.equal(source.opacity, 0); assert.equal(source.volume, 1);
  assert.equal(source.props.stream, null); assert.equal(source.props.videoElement, null); assert.equal(source.props.objectUrl, undefined);
  assert.equal(source.audioFilters.length, 1);
  assert.equal(JSON.stringify(JSON.parse(state.exportScenesJSON()).scenes).includes('blob:secret'), false);
});

test('an account-scoped collection round trips layout without persisting source streams or object URLs', async t => {
  const { state, compositor, saved } = fixture(t); await state.initDefaultSetup();
  const source = new SourceItem({ type: 'image', props: { objectUrl: 'blob:local', imageElement: { complete: true } } }); state.addSource(source);
  assert.ok(saved.has('test:no-ar:alice')); assert.equal(saved.has('lab:tool:gravador:state'), false);
  const restore = new AppState(compositor, {}, { storageKey: 'test:no-ar:alice' });
  assert.equal(restore.loadSavedSetup(), true); assert.equal(restore.currentScene.sources.length, 1);
  assert.equal(restore.currentScene.sources[0].props.imageElement, null); assert.equal(restore.currentScene.sources[0].props.objectUrl, undefined);
});

test('audio filter reorder changes the live DSP chain and persists immediately', () => {
  const dialog = Object.create(AudioFiltersDialog.prototype);
  const gain = { id: 'gain', type: 'gain' }, limiter = { id: 'limiter', type: 'limiter' };
  const calls = [];
  Object.assign(dialog, { currentSource: { id: 'mic', audioFilters: [gain, limiter] }, selectedFilterId: 'limiter', audioEngine: { applyAudioFilters: (id, chain) => calls.push([id, ...chain.map(filter => filter.type)]) }, onUpdate: () => calls.push('saved'), renderFilterList() {} });
  dialog._moveFilter(-1);
  assert.deepEqual(dialog.currentSource.audioFilters, [limiter, gain]);
  assert.deepEqual(calls, [['mic', 'limiter', 'gain'], 'saved']);
  dialog._moveFilter(-1); assert.equal(calls.length, 2);
});
