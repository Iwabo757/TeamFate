import { supabase } from "./supabase";

export type Achievement = {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  reward: number;
  requirement_type:
    | "shiny_count"
    | "event_participation"
    | "event_wins"
    | "daily_streak"
    | "bounty_caught";
  threshold: number;
  enabled: boolean;
};

export async function getAchievements() {
  const { data, error } = await supabase
    .from("fate_achievements")
    .select("*")
    .eq("enabled", true)
    .order("threshold", { ascending: true });
  return { data: data as Achievement[] | null, error };
}

export async function getAllAchievements() {
  const { data, error } = await supabase
    .from("fate_achievements")
    .select("*")
    .order("threshold", { ascending: true });
  return { data: data as Achievement[] | null, error };
}

export async function awardPoints(
  profileId: string,
  amount: number,
  reason: string,
  sourceKey?: string
) {
  if (!amount) return { error: null };

  const { error } = await supabase
    .from("fate_point_transactions")
    .insert({
      profile_id: profileId,
      amount,
      reason,
      source_key: sourceKey || null,
    });

  return { error };
}

export function getUnlockedAchievements({
  achievements = [],
  shinyCount,
  eventCount,
  eventWins,
  dailyStreak,
  bountyCaught,
}: {
  achievements: Achievement[];
  shinyCount: number;
  eventCount: number;
  eventWins: number;
  dailyStreak: number;
  bountyCaught?: number;
}) {
  return achievements.filter((achievement) => {
    switch (achievement.requirement_type) {
      case "shiny_count":
        return shinyCount >= achievement.threshold;
      case "event_participation":
        return eventCount >= achievement.threshold;
      case "event_wins":
        return eventWins >= achievement.threshold;
      case "daily_streak":
        return dailyStreak >= achievement.threshold;
      case "bounty_caught":
        return (bountyCaught ?? 0) >= achievement.threshold;
      default:
        return false;
    }
  });
}

export function getDailyChallenge(date = new Date()) {
  const challenges = [
    { key: "catch_50", title: "Catch 50 Pokémon", description: "Catch 50 Pokémon today.", reward: 100 },
    { key: "participate_event", title: "Join a Faté Event", description: "Participate in any Faté event today.", reward: 150 },
    { key: "submit_shiny", title: "Show Off a Shiny", description: "Submit a shiny to the Faté Showcase.", reward: 200 },
    { key: "visit_site", title: "Check In", description: "Complete today's Faté Daily check-in.", reward: 50 },
    { key: "community", title: "Community Day", description: "Participate in a Faté community activity.", reward: 100 },
  ];

  const utcDay = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000
  );

  return {
    ...challenges[utcDay % challenges.length],
    date: date.toISOString().slice(0, 10),
  };
}
