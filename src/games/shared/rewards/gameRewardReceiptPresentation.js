export function presentClaimAchievements(receipt) {
  return (receipt?.achievements || []).map((achievement) => ({
    key: achievement.key,
    title: achievement.title,
    ...(achievement.collectible ? { collectible: achievement.collectible } : {}),
  }));
}
