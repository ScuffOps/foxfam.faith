import { FAMILIAR_SPECIES, normalizeFamiliarSelection } from "./familiarCatalog.js";

export const FAMILIAR_CALLING_AFFINITIES = Object.freeze({
  comfort: Object.freeze({
    label: "Hearthkeeper",
    species: "cloud-poodle",
    description: "You make uncertain places feel safe enough to rest.",
  }),
  curiosity: Object.freeze({
    label: "Lanternhand",
    species: "fox-cat",
    description: "You follow small mysteries until they become useful wonders.",
  }),
  wonder: Object.freeze({
    label: "Stargazer",
    species: "shrine-cat",
    description: "You notice the strange light hiding inside ordinary things.",
  }),
  intuition: Object.freeze({
    label: "Dreamlistener",
    species: "moon-rabbit",
    description: "You trust quiet signs and the truths that arrive sideways.",
  }),
  patience: Object.freeze({
    label: "Gardentender",
    species: "moss-turtle",
    description: "You give good things the time and care they need to grow.",
  }),
  joy: Object.freeze({
    label: "Chorusheart",
    species: "moon-seal",
    description: "You turn shared delight into a kind of courage.",
  }),
});

export const FAMILIAR_CALLING_QUESTIONS = Object.freeze([
  Object.freeze({
    id: "midnight-door",
    prompt: "A little door appears in the Priory wall after midnight. What makes you open it?",
    options: Object.freeze([
      Object.freeze({ id: "warm-light", label: "Warm light and the sound of a kettle", affinities: Object.freeze(["comfort", "joy"]) }),
      Object.freeze({ id: "tiny-lock", label: "A lock built from unfamiliar clockwork", affinities: Object.freeze(["curiosity", "wonder"]) }),
      Object.freeze({ id: "distant-song", label: "A song you almost remember", affinities: Object.freeze(["intuition", "patience"]) }),
    ]),
  }),
  Object.freeze({
    id: "starstorm",
    prompt: "A starstorm rattles every window in the Quarters. Where do you go first?",
    options: Object.freeze([
      Object.freeze({ id: "blankets", label: "Gather blankets and check on everyone", affinities: Object.freeze(["comfort", "patience"]) }),
      Object.freeze({ id: "sparks", label: "Follow the sparks skipping across the roof", affinities: Object.freeze(["curiosity", "joy"]) }),
      Object.freeze({ id: "echo", label: "Listen for a message inside the thunder", affinities: Object.freeze(["intuition", "wonder"]) }),
    ]),
  }),
  Object.freeze({
    id: "small-gift",
    prompt: "You leave one small gift at an unmarked shrine. Which feels right?",
    options: Object.freeze([
      Object.freeze({ id: "ribbon", label: "A ribbon you carefully mended", affinities: Object.freeze(["comfort", "curiosity"]) }),
      Object.freeze({ id: "seed", label: "A seed saved from your favorite flower", affinities: Object.freeze(["patience", "joy"]) }),
      Object.freeze({ id: "map", label: "A map of a place that may not exist", affinities: Object.freeze(["wonder", "intuition"]) }),
    ]),
  }),
  Object.freeze({
    id: "courtyard-festival",
    prompt: "The courtyard festival needs one last helper. What do you volunteer to do?",
    options: Object.freeze([
      Object.freeze({ id: "tea", label: "Keep the tea warm and welcome late arrivals", affinities: Object.freeze(["comfort", "joy"]) }),
      Object.freeze({ id: "lanterns", label: "Repair the lantern rig before sunset", affinities: Object.freeze(["curiosity", "patience"]) }),
      Object.freeze({ id: "constellations", label: "Read the new constellations aloud", affinities: Object.freeze(["wonder", "intuition"]) }),
    ]),
  }),
  Object.freeze({
    id: "homeward-path",
    prompt: "At the end of a long day, which path home calls to you?",
    options: Object.freeze([
      Object.freeze({ id: "moss", label: "The mossy steps where every stone is familiar", affinities: Object.freeze(["patience", "comfort"]) }),
      Object.freeze({ id: "bridge", label: "The lantern bridge with a new mark on its rail", affinities: Object.freeze(["curiosity", "wonder"]) }),
      Object.freeze({ id: "water", label: "The moonlit bank where friends are still laughing", affinities: Object.freeze(["intuition", "joy"]) }),
    ]),
  }),
]);

const AFFINITY_ORDER = Object.freeze(Object.keys(FAMILIAR_CALLING_AFFINITIES));

export function resolveFamiliarCalling(answers) {
  const scores = Object.fromEntries(AFFINITY_ORDER.map((affinity) => [affinity, 0]));

  FAMILIAR_CALLING_QUESTIONS.forEach((question) => {
    const answerId = answers?.[question.id];
    const option = question.options.find((candidate) => candidate.id === answerId);
    option?.affinities.forEach((affinity) => {
      scores[affinity] += 1;
    });
  });

  return AFFINITY_ORDER
    .map((affinity, order) => ({
      affinity,
      order,
      score: scores[affinity],
      ...FAMILIAR_CALLING_AFFINITIES[affinity],
    }))
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, 3)
    .map(({ order: _order, ...result }) => Object.freeze(result));
}

export function createCallingFamiliar(current, species) {
  if (!Object.hasOwn(FAMILIAR_SPECIES, species)) {
    throw new Error("Choose a familiar from the Priory calling circle.");
  }
  return normalizeFamiliarSelection({ ...current, species });
}
