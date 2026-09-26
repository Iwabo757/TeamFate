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

/*
 * Achievements are now stored in Supabase instead of being hard-coded.
 * Staff can add/edit/disable them from /admin/achievements.
 */

export async function getAchievements() {
  const { data, error } = await supabase
    .from("fate_achievements")
    .select("*")
    .eq("enabled", true)
    .order("threshold", { ascending: true });

  return {
    data: (data || []) as Achievement[],
    error,
  };
}

export async function getAllAchievements() {
  const { data, error } = await supabase
    .from("fate_achievements")
    .select("*")
    .order("threshold", { ascending: true });

  return {
    data: (data || []) as Achievement[],
    error,
  };
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
  achievements,
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
  bountyCaught: number;
}) {
  return achievements.map((achievement) => {
    let value = 0;

    switch (achievement.requirement_type) {
      case "shiny_count":
        value = shinyCount;
        break;
      case "event_participation":
        value = eventCount;
        break;
      case "event_wins":
        value = eventWins;
        break;
      case "daily_streak":
        value = dailyStreak;
        break;
      case "bounty_caught":
        value = bountyCaught;
        break;
    }

    return {
      ...achievement,
      currentValue: value,
      unlocked: value >= achievement.threshold,
    };
  });
}
