import { RELIC_CHARM_CATALOG } from "../../../lib/relicCharms.js";

const CATCH_EFFECT_CHARMS = new Map(
  RELIC_CHARM_CATALOG.flatMap((charm) => (
    charm.kind === "achievement" && typeof charm.effects?.catch_effect === "string"
      ? [[charm.key, charm]]
      : []
  )),
);

export function selectAuthoritativeCatchEffect(charms = [], claim = null) {
  if (claim?.catch?.duplicate !== true || claim.catch.duplicatePolicy !== "release") return null;

  for (const charm of charms) {
    const charmKey = charm?.charmKey || charm?.charm_key;
    const definition = CATCH_EFFECT_CHARMS.get(charmKey);
    if (
      !definition
      || charm.equipped !== true
      || charm.source?.type !== "achievement"
      || charm.source?.key !== "gentle-return"
    ) continue;

    return {
      key: definition.effects.catch_effect,
      label: definition.name,
    };
  }

  return null;
}
