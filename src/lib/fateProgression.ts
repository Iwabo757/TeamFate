import { supabase } from "./supabase";

export const ACHIEVEMENTS = [
  { key: "first_shiny", name: "First Spark", description: "Catch your first shiny.", icon: "✨", reward: 100 },
  { key: "shiny_10", name: "Shiny Collector", description: "Collect 10 shinies.", icon: "💎", reward: 250 },
  { key: "shiny_25", name: "Shiny Hoarder", description: "Collect 25 shinies.", icon: "👑", reward: 500 },
  { key: "event_10", name: "Event Warrior", description: "Participate in 10 events.", icon: "⚔️", reward: 250 },
  { key: "event_wins_5", name: "Champion", description: "Win 5 Faté events.", icon: "🏆", reward: 500 },
  { key: "daily_7", name: "Weekly Warrior", description: "Reach a 7-day Faté Daily streak.", icon: "🔥", reward: 250 },
  { key: "daily_30", name: "Daily Legend", description: "Reach a 30-day Faté Daily streak.", icon: "🌟", reward: 1000 },
];

export async function awardPoints(profileId: string, amount: number, reason: string, sourceKey?: string) {
  if (!amount) return { error: null };
  const { error } = await supabase.from("fate_point_transactions").insert({
    profile_id: profileId,
    amount,
    reason,
    source_key: sourceKey || null,
  });
  return { error };
}

export function getUnlockedAchievements({
  shinyCount,
  eventCount,
  eventWins,
  dailyStreak,
}: {
  shinyCount: number;
  eventCount: number;
  eventWins: number;
  dailyStreak: number;
}) {
  const unlocked = new Set<string>();
  if (shinyCount >= 1) unlocked.add("first_shiny");
  if (shinyCount >= 10) unlocked.add("shiny_10");
  if (shinyCount >= 25) unlocked.add("shiny_25");
  if (eventCount >= 10) unlocked.add("event_10");
  if (eventWins >= 5) unlocked.add("event_wins_5");
  if (dailyStreak >= 7) unlocked.add("daily_7");
  if (dailyStreak >= 30) unlocked.add("daily_30");
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked.has(achievement.key),
  }));
}

export function getDailyChallenge(date = new Date()) {
  const challenges = [
    { key: "catch_50", title: "Catch 50 Pokémon", description: "Catch 50 Pokémon today.", reward: 100 },
    { key: "participate_event", title: "Join a Faté Event", description: "Participate in any Faté event today.", reward: 150 },
    { key: "submit_shiny", title: "Show Off a Shiny", description: "Submit a shiny to the Faté Showcase.", reward: 200 },
    { key: "visit_site", title: "Check In", description: "Complete today's Faté Daily check-in.", reward: 50 },
    { key: "community", title: "Community Day", description: "Participate in a Faté community activity.", reward: 100 },
  ];
  const utcDay = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  return { ...challenges[utcDay % challenges.length], date: date.toISOString().slice(0, 10) };
}
