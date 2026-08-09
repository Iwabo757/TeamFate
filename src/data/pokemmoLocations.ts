import monsters from "./monsters.json";

export type PokeMMOLocation = {
  form: number;
  type: string;
  region_id: number;
  region_name: string;
  location_id: number;
  location_name: string;
  location_name_full: string;
  min_level: number;
  max_level: number;
  season: string;
  is_horde_3x: boolean;
  is_horde_5x: boolean;
  rarity_flags: number;
  rarity_morning: string;
  rarity_day: string;
  rarity_night: string;
};

type Monster = {
  id: number;
  name: string;
  locations?: PokeMMOLocation[];
};

const monsterData = monsters as Monster[];

export function getPokeMMOLocations(
  pokemonId: number
): PokeMMOLocation[] {
  const monster = monsterData.find(
    (entry) => entry.id === pokemonId
  );

  if (!monster?.locations) {
    return [];
  }

  return monster.locations;
}