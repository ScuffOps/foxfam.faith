import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_FAMILIAR, FAMILIAR_SPECIES } from "./familiarCatalog.js";
import {
  FAMILIAR_CALLING_AFFINITIES,
  FAMILIAR_CALLING_QUESTIONS,
  createCallingFamiliar,
  resolveFamiliarCalling,
} from "./familiarCalling.js";

test("the calling offers five complete questions with valid affinity pairs", () => {
  assert.equal(FAMILIAR_CALLING_QUESTIONS.length, 5);
  for (const question of FAMILIAR_CALLING_QUESTIONS) {
    assert.equal(question.options.length, 3);
    for (const option of question.options) {
      assert.equal(option.affinities.length, 2);
      option.affinities.forEach((affinity) => assert.ok(FAMILIAR_CALLING_AFFINITIES[affinity]));
    }
  }
});

test("calling results recommend three distinct available familiar species", () => {
  const answers = Object.fromEntries(
    FAMILIAR_CALLING_QUESTIONS.map((question) => [question.id, question.options[0].id]),
  );
  const results = resolveFamiliarCalling(answers);

  assert.equal(results.length, 3);
  assert.equal(new Set(results.map((result) => result.species)).size, 3);
  results.forEach((result) => assert.ok(FAMILIAR_SPECIES[result.species]));
  assert.equal(results[0].affinity, "comfort");
});

test("the final choice remains player-controlled and normalizes species-specific layers", () => {
  const selection = createCallingFamiliar(DEFAULT_FAMILIAR, "moon-seal");
  assert.equal(selection.species, "moon-seal");
  assert.ok(FAMILIAR_SPECIES[selection.species].coats.includes(selection.coat));
  assert.ok(FAMILIAR_SPECIES[selection.species].markings.includes(selection.markings));
  assert.equal(selection.outfit, DEFAULT_FAMILIAR.outfit);
});

test("unknown familiar choices fail closed", () => {
  assert.throws(() => createCallingFamiliar(DEFAULT_FAMILIAR, "unknown"), /calling circle/i);
});
