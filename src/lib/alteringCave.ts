import Papa from "papaparse";

const SHEET_ID =
  "12lZupylxLAKUVQQJZIC8GJmvQiUwpbAAQ3BduAu_rig";

const GID = "1031347870";

const SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

export interface AlteringCaveData {
  crystal: string;
  encounters: string[];
  hordes: string[];
  raw: string[][];
}

export async function getAlteringCaveData(): Promise<AlteringCaveData> {
  const response = await fetch(SHEET_URL);

  if (!response.ok) {
    throw new Error("Failed to load Altering Cave data");
  }

  const csv = await response.text();

  const parsed = Papa.parse<string[]>(csv, {
    skipEmptyLines: true,
  });

  return {
    crystal: "",
    encounters: [],
    hordes: [],
    raw: parsed.data,
  };
}