import test from "node:test";
import assert from "node:assert/strict";
import { safeMedia, validLessonMedia, videoId } from "./media.ts";

test("lesson URLs reject executable content and pages outside the training", () => {
  for (const bad of ["javascript:alert(1)", "data:text/html,test", "//outside.test/page", "https://user:secret@outside.test/movie.mp4"]) assert.equal(safeMedia(bad), null);
  assert.equal(validLessonMedia("page", "/aula-head/index.html"), true);
  assert.equal(validLessonMedia("page", "/aula-head/../tools/academy/index.html"), false);
  assert.equal(validLessonMedia("page", "https://outside.test/aula-head/index.html"), false);
  assert.equal(validLessonMedia("video", "https://media.umcaracaramelo.com.br/aula.mp4"), true);
});

test("only supported video providers and valid IDs produce embeds", () => {
  assert.equal(videoId("youtube", "https://www.youtube.com/watch?v=M7lc1UVf-VE"), "M7lc1UVf-VE");
  assert.equal(videoId("youtube", "https://youtu.be/M7lc1UVf-VE"), "M7lc1UVf-VE");
  assert.equal(videoId("youtube", "https://outside.test/M7lc1UVf-VE"), null);
  assert.equal(videoId("vimeo", "https://vimeo.com/123456789"), "123456789");
  assert.equal(videoId("vimeo", "https://outside.test/123456789"), null);
});
