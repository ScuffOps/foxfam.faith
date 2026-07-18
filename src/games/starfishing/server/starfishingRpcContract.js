const STARFISHING_FISH_KEYS = new Set([
  "ember-mote",
  "lunar-guppy",
  "aurora-minnow",
  "comet-koi",
  "eclipse-ray",
  "veri-starwhale",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RARITIES = new Set(["common", "uncommon", "rare", "epic", "mythic"]);
const DUPLICATE_POLICIES = new Set(["none", "keep", "release", "convert"]);
const PASSIVE_EFFECT_CAPS = {
  favor_multiplier_bps: 2500,
  material_multiplier_bps: 2500,
  rare_bite_bonus_bps: 500,
  size_floor_bps: 1000,
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
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
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

  return {
    catch: {
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
    },
    fishpedia: {
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
        min: 1,
      }),
      catalogCount: requireInteger(fishpedia.catalog_count, "Fishpedia catalog count", { min: 1 }),
      completionPercent: requireInteger(
        fishpedia.completion_percent,
        "Fishpedia completion percent",
        { min: 0, max: 100 },
      ),
    },
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
    achievements: requireArray(result.achievements, "Achievements").map((rawAchievement) => {
      const achievement = requireObject(rawAchievement, "Achievement result");
      return {
        achievementKey: requireString(achievement.achievement_key, "Achievement key"),
        title: requireString(achievement.title, "Achievement title"),
        description: requireString(achievement.description, "Achievement description"),
      };
    }),
    charms: requireArray(result.charms, "Charms").map((rawCharm) => {
      const charm = requireObject(rawCharm, "Charm result");
      const source = requireObject(charm.source, "Charm source");
      if (source.type !== "achievement") {
        throw new TypeError("Charm source type is unknown.");
      }
      return {
        id: requireUuid(charm.id, "Charm ID"),
        charmKey: requireString(charm.charm_key, "Charm key"),
        label: requireString(charm.label, "Charm label"),
        rarity: requireEnum(charm.rarity, RARITIES, "Charm rarity"),
        slot: requireString(charm.slot, "Charm slot"),
        effects: requireObject(charm.effects, "Charm effects"),
        equipped: requireBoolean(charm.equipped, "Charm equipped status"),
        acquiredAt: requireTimestamp(charm.acquired_at, "Charm acquisition timestamp"),
        source: {
          type: "achievement",
          key: requireString(source.key, "Charm achievement source key"),
        },
      };
    }),
    appliedEffects: normalizeAppliedEffects(result.applied_effects),
    replayed: requireBoolean(result.replayed, "Claim replay status"),
  };
}
