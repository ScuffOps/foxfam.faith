const STARFISHING_FISH_KEYS = new Set([
  "ember-mote",
  "lunar-guppy",
  "aurora-minnow",
  "comet-koi",
  "eclipse-ray",
  "veri-starwhale",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
const RARITIES = new Set(["common", "uncommon", "rare", "epic", "mythic"]);
const DUPLICATE_POLICIES = new Set(["none", "keep", "release", "convert"]);
const STARFISHING_ACHIEVEMENT_DEFINITIONS = {
  "first-light": {
    title: "First Light",
    description: "Make your first successful Starfishing catch.",
  },
  "gentle-return": {
    title: "Gentle Return",
    description: "Release your first duplicate catch for Favor.",
  },
  "pocket-constellation": {
    title: "Pocket Constellation",
    description: "Catch a fish within the lowest 5% of its canonical size span.",
  },
  "myth-in-moonwater": {
    title: "Myth in Moonwater",
    description: "Make your first mythic catch.",
  },
  "celestial-archivist": {
    title: "Celestial Archivist",
    description: "Catch every active fish in the current catalog.",
  },
  "hundred-lights": {
    title: "Hundred Lights",
    description: "Record 100 successful catches.",
  },
};
const PASSIVE_EFFECT_CAPS = {
  favor_multiplier_bps: 2500,
  material_multiplier_bps: 2500,
  rare_bite_bonus_bps: 500,
  size_floor_bps: 1000,
};
const COSMETIC_EFFECT_KEYS = new Set([
  "catch_effect",
  "profile_particle",
  "profile_frame",
]);
const ACHIEVEMENT_CHARM_DEFINITIONS = {
  "starlit-bobber": {
    achievementKey: "first-light",
    label: "Starlit Bobber",
    rarity: "uncommon",
    slot: "fishing",
    effectKey: "favor_multiplier_bps",
    effectValue: 500,
  },
  "merciful-tide": {
    achievementKey: "gentle-return",
    label: "Merciful Tide",
    rarity: "rare",
    slot: "catch-fx",
    effectKey: "catch_effect",
    effectValue: "merciful-tide",
  },
  "pocket-star": {
    achievementKey: "pocket-constellation",
    label: "Pocket Star",
    rarity: "epic",
    slot: "profile-particle",
    effectKey: "profile_particle",
    effectValue: "pocket-star",
  },
  "glassfin-comet": {
    achievementKey: "myth-in-moonwater",
    label: "Glassfin Comet",
    rarity: "mythic",
    slot: "fishing",
    effectKey: "rare_bite_bonus_bps",
    effectValue: 300,
  },
  "fishpedia-frame": {
    achievementKey: "celestial-archivist",
    label: "Fishpedia Frame",
    rarity: "mythic",
    slot: "profile-frame",
    effectKey: "profile_frame",
    effectValue: "fishpedia-frame",
  },
  "century-chain": {
    achievementKey: "hundred-lights",
    label: "Century Chain",
    rarity: "epic",
    slot: "fishing",
    effectKey: "material_multiplier_bps",
    effectValue: 750,
  },
};

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function requireUuid(value, label) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a UUID.`);
  }
  return value;
}

function requireInteger(value, label, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new TypeError(`${label} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function requireNumber(value, label, { min = -Infinity, max = Infinity } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new TypeError(`${label} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${label} must be a boolean.`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array.`);
  }
  return value;
}

function requireTimestamp(value, label) {
  const match = typeof value === "string" ? ISO_TIMESTAMP_PATTERN.exec(value) : null;
  if (!match) {
    throw new TypeError(`${label} must be an ISO timestamp.`);
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const zoneHour = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const zoneMinute = zone === "Z" ? 0 : Number(zone.slice(4, 6));
  const daysInMonth = month >= 1 && month <= 12
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 0;

  if (
    day < 1
    || day > daysInMonth
    || hour > 23
    || minute > 59
    || second > 59
    || zoneHour > 23
    || zoneMinute > 59
    || !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`${label} must be an ISO timestamp.`);
  }
  return value;
}

function requireKnownFishKey(value) {
  if (!STARFISHING_FISH_KEYS.has(value)) {
    throw new TypeError("Response contains an unknown fish key.");
  }
  return value;
}

function requireEnum(value, allowedValues, label) {
  if (!allowedValues.has(value)) {
    throw new TypeError(`${label} is unknown.`);
  }
  return value;
}

function normalizeAppliedEffects(value) {
  return requireArray(value, "Applied effects").map((rawEffect) => {
    const effect = requireObject(rawEffect, "Applied effect");
    const cap = PASSIVE_EFFECT_CAPS[effect.key];

    if (cap === undefined) {
      throw new TypeError("Response contains an unknown passive effect key.");
    }

    return {
      key: effect.key,
      value: requireInteger(effect.value, "Passive effect value", { min: 0, max: cap }),
      label: requireString(effect.label, "Passive effect label"),
    };
  });
}

function normalizeAchievementResults(value) {
  const seenKeys = new Set();
  return requireArray(value, "Achievements").map((rawAchievement) => {
    const achievement = requireObject(rawAchievement, "Achievement result");
    const achievementKey = requireString(achievement.achievement_key, "Achievement key");
    const definition = STARFISHING_ACHIEVEMENT_DEFINITIONS[achievementKey];

    if (!definition) {
      throw new TypeError("Response contains an unknown achievement key.");
    }
    if (seenKeys.has(achievementKey)) {
      throw new TypeError("Response contains a duplicate achievement key.");
    }
    seenKeys.add(achievementKey);

    if (
      achievement.title !== definition.title
      || achievement.description !== definition.description
    ) {
      throw new TypeError("Achievement result does not match its canonical reward shape.");
    }

    return {
      achievementKey,
      title: definition.title,
      description: definition.description,
    };
  });
}

function normalizeCharmResults(value) {
  const seenIds = new Set();
  const seenCharmKeys = new Set();
  const seenSourceKeys = new Set();
  return requireArray(value, "Charms").map((rawCharm) => {
    const charm = requireObject(rawCharm, "Charm result");
    const source = requireObject(charm.source, "Charm source");
    const charmKey = requireString(charm.charm_key, "Charm key");
    const definition = ACHIEVEMENT_CHARM_DEFINITIONS[charmKey];

    if (!definition) {
      throw new TypeError("Response contains an unknown achievement charm.");
    }
    if (source.type !== "achievement" || source.key !== definition.achievementKey) {
      throw new TypeError("Achievement charm source does not match its canonical reward shape.");
    }
    if (seenCharmKeys.has(charmKey) || seenSourceKeys.has(source.key)) {
      throw new TypeError("Response contains a duplicate canonical charm source.");
    }
    seenCharmKeys.add(charmKey);
    seenSourceKeys.add(source.key);
    if (
      charm.label !== definition.label
      || charm.rarity !== definition.rarity
      || charm.slot !== definition.slot
    ) {
      throw new TypeError("Achievement charm does not match its canonical reward shape.");
    }

    const effects = requireObject(charm.effects, "Charm effects");
    const effectKeys = Object.keys(effects);
    const effectValue = effects[definition.effectKey];
    const passiveCap = PASSIVE_EFFECT_CAPS[definition.effectKey];
    const hasCanonicalEffect = effectKeys.length === 1
      && effectKeys[0] === definition.effectKey
      && effectValue === definition.effectValue;
    const hasAllowedPassiveEffect = typeof definition.effectValue === "number"
      && passiveCap !== undefined
      && Number.isSafeInteger(effectValue)
      && effectValue >= 0
      && effectValue <= passiveCap;
    const hasAllowedCosmeticEffect = typeof definition.effectValue === "string"
      && COSMETIC_EFFECT_KEYS.has(definition.effectKey);

    if (!hasCanonicalEffect || (!hasAllowedPassiveEffect && !hasAllowedCosmeticEffect)) {
      throw new TypeError("Achievement charm reward shape contains invalid effects.");
    }

    const id = requireUuid(charm.id, "Charm ID");
    if (seenIds.has(id)) {
      throw new TypeError("Response contains a duplicate charm ID.");
    }
    seenIds.add(id);

    return {
      id,
      charmKey,
      label: definition.label,
      rarity: definition.rarity,
      slot: definition.slot,
      effects: { [definition.effectKey]: definition.effectValue },
      equipped: requireBoolean(charm.equipped, "Charm equipped status"),
      acquiredAt: requireTimestamp(charm.acquired_at, "Charm acquisition timestamp"),
      source: {
        type: "achievement",
        key: definition.achievementKey,
      },
    };
  });
}

export function normalizeCastTicket(value) {
  const ticket = requireObject(value, "Cast ticket");
  const normalized = {
    ticketId: requireUuid(ticket.ticket_id, "Cast ticket ID"),
    fishKey: requireKnownFishKey(ticket.fish_key),
    qteLength: requireInteger(ticket.qte_length, "QTE length", { min: 1, max: 16 }),
  };

  if (ticket.applied_effects !== undefined) {
    normalized.appliedEffects = normalizeAppliedEffects(ticket.applied_effects);
  }
  if (ticket.not_before !== undefined) {
    normalized.notBefore = requireTimestamp(ticket.not_before, "Cast ticket earliest claim time");
  }
  normalized.expiresAt = requireTimestamp(ticket.expires_at, "Cast ticket expiry");

  return normalized;
}

export function normalizeCatchClaimResult(value) {
  const result = requireObject(value, "Catch claim result");
  const favor = requireObject(result.favor, "Favor result");

  if (!Number.isSafeInteger(favor.balance) || favor.balance < 0) {
    throw new TypeError("Catch claim result requires an authoritative Favor balance.");
  }

  const catchResult = requireObject(result.catch, "Catch result");
  const fishpedia = requireObject(result.fishpedia, "Fishpedia result");
  const normalizedCatch = {
    id: requireUuid(catchResult.id, "Catch ID"),
    fishKey: requireKnownFishKey(catchResult.fish_key),
    label: requireString(catchResult.label, "Catch label"),
    rarity: requireEnum(catchResult.rarity, RARITIES, "Catch rarity"),
    size: requireNumber(catchResult.size, "Catch size", { min: Number.MIN_VALUE }),
    duplicate: requireBoolean(catchResult.duplicate, "Catch duplicate status"),
    duplicatePolicy: requireEnum(
      catchResult.duplicate_policy,
      DUPLICATE_POLICIES,
      "Catch duplicate policy",
    ),
    caughtAt: requireTimestamp(catchResult.caught_at, "Catch timestamp"),
  };
  const normalizedFishpedia = {
    fishKey: requireKnownFishKey(fishpedia.fish_key),
    caughtCount: requireInteger(fishpedia.caught_count, "Fishpedia caught count", { min: 1 }),
    smallestSize: requireNumber(fishpedia.smallest_size, "Fishpedia smallest size", {
      min: Number.MIN_VALUE,
    }),
    largestSize: requireNumber(fishpedia.largest_size, "Fishpedia largest size", {
      min: Number.MIN_VALUE,
    }),
    firstCaughtAt: requireTimestamp(fishpedia.first_caught_at, "Fishpedia first catch"),
    lastCaughtAt: requireTimestamp(fishpedia.last_caught_at, "Fishpedia last catch"),
    discoveredCount: requireInteger(fishpedia.discovered_count, "Fishpedia discovered count", {
      min: 0,
    }),
    catalogCount: requireInteger(fishpedia.catalog_count, "Fishpedia catalog count", { min: 0 }),
    completionPercent: requireInteger(
      fishpedia.completion_percent,
      "Fishpedia completion percent",
      { min: 0, max: 100 },
    ),
  };

  if (
    (normalizedCatch.duplicate && normalizedCatch.duplicatePolicy === "none")
    || (!normalizedCatch.duplicate && normalizedCatch.duplicatePolicy !== "none")
  ) {
    throw new TypeError("Catch duplicate policy contradicts its duplicate status.");
  }
  if (normalizedCatch.fishKey !== normalizedFishpedia.fishKey) {
    throw new TypeError("Catch and Fishpedia fish keys must agree.");
  }
  if (normalizedFishpedia.smallestSize > normalizedFishpedia.largestSize) {
    throw new TypeError("Fishpedia size range is inverted.");
  }
  if (
    normalizedCatch.size < normalizedFishpedia.smallestSize
    || normalizedCatch.size > normalizedFishpedia.largestSize
  ) {
    throw new TypeError("Catch size falls outside the authoritative Fishpedia size range.");
  }

  return {
    catch: normalizedCatch,
    fishpedia: normalizedFishpedia,
    favor: {
      delta: requireInteger(favor.delta, "Favor delta", { min: 0 }),
      balance: favor.balance,
    },
    materials: requireArray(result.materials, "Materials").map((rawMaterial) => {
      const material = requireObject(rawMaterial, "Material result");
      return {
        key: requireString(material.key, "Material key"),
        label: requireString(material.label, "Material label"),
        delta: requireInteger(material.delta, "Material delta", { min: 0 }),
        balance: requireInteger(material.balance, "Material balance", { min: 0 }),
      };
    }),
    achievements: normalizeAchievementResults(result.achievements),
    charms: normalizeCharmResults(result.charms),
    appliedEffects: normalizeAppliedEffects(result.applied_effects),
    replayed: requireBoolean(result.replayed, "Claim replay status"),
  };
}
