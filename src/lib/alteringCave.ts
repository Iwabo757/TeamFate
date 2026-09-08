import Papa from "papaparse";

const SHEET_ID =
  "12lZupylxLAKUVQQJZIC8GJmvQiUwpbAAQ3BduAu_rig";

const GID = "1031347870";

const SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

export interface AlteringCaveData {
  crystal: string;
  encounters: string[];
  rareEncounters: string[];
  hordes: string[];
  raw: string[][];
}

/* =========================================================
   HELPERS
   ========================================================= */

const normalize = (value: unknown): string =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeRow = (row: string[]): string[] =>
  row.map(normalize);

const unique = (items: string[]): string[] =>
  [...new Set(items.map(normalize).filter(Boolean))];

/*
 * Values that should never be treated as Pokémon.
 */
const BLOCKED_VALUES = new Set([
  "",
  "active",
  "current",
  "singles",
  "single",
  "rare singles",
  "rare single",
  "hordes",
  "horde",
  "tier",
  "rotation",
  "crystal",
  "pokemon",
  "pokémon",
  "type",
  "types",

  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
]);

const isPokemon = (value: string): boolean => {
  const text = normalize(value);

  if (!text) {
    return false;
  }

  const lower = text.toLowerCase();

  if (BLOCKED_VALUES.has(lower)) {
    return false;
  }

  /*
   * Ignore labels such as:
   * Rotation 1
   * Rotation 2
   * Tier
   * Tier 1
   */
  if (/^rotation\s*\d+$/i.test(text)) {
    return false;
  }

  if (/^tier\s*\d*$/i.test(text)) {
    return false;
  }

  /*
   * Ignore entries such as:
   * Zorua (All Hordes)
   */
  if (
    text.includes("(") ||
    text.includes(")")
  ) {
    return false;
  }

  return true;
};

/* =========================================================
   CURRENT ALTERING CAVE DATA
   ========================================================= */

/*
 * IMPORTANT:
 *
 * The Current Altering Cave information is in COLUMN A.
 *
 * Singles:
 *   A6 - A10
 *
 * Rare Singles:
 *   A12 - A13
 *
 * Hordes:
 *   A15 - A16
 *
 * JavaScript arrays are zero-based, so:
 *
 * Spreadsheet A6  = raw[5][0]
 * Spreadsheet A10 = raw[9][0]
 *
 * Spreadsheet A12 = raw[11][0]
 * Spreadsheet A13 = raw[12][0]
 *
 * Spreadsheet A15 = raw[14][0]
 * Spreadsheet A16 = raw[15][0]
 *
 * We intentionally do NOT:
 *
 * - search for ACTIVE
 * - search for CURRENT
 * - scan historical rotations
 * - inspect other Pokémon columns
 *
 * The Current section in column A is the source of truth.
 */

/* =========================================================
   READ A RANGE
   ========================================================= */

const getColumnARange = (
  rows: string[][],
  startRow: number,
  endRow: number,
): string[] => {
  const values: string[] = [];

  /*
   * startRow/endRow are spreadsheet row numbers.
   * They are converted to zero-based array indexes here.
   */
  for (
    let sheetRow = startRow;
    sheetRow <= endRow;
    sheetRow++
  ) {
    const rowIndex = sheetRow - 1;
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    const value = normalize(row[0]);

    if (isPokemon(value)) {
      values.push(value);
    }
  }

  return unique(values);
};

/* =========================================================
   FIND CRYSTAL
   ========================================================= */

const findCrystal = (
  rows: string[][],
): string => {
  for (const row of rows) {
    if (!row) {
      continue;
    }

    for (
      let columnIndex = 0;
      columnIndex < row.length;
      columnIndex++
    ) {
      const value = normalize(
        row[columnIndex],
      ).toLowerCase();

      if (value !== "crystal") {
        continue;
      }

      const nextValue = normalize(
        row[columnIndex + 1],
      );

      if (isPokemon(nextValue)) {
        return nextValue;
      }
    }
  }

  return "";
};

/* =========================================================
   LOAD ALTERING CAVE DATA
   ========================================================= */

export async function getAlteringCaveData(): Promise<AlteringCaveData> {
  console.log(
    "Loading Altering Cave spreadsheet...",
  );

  const response = await fetch(SHEET_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to load Altering Cave data: ${response.status}`,
    );
  }

  const csv = await response.text();

  if (!csv.trim()) {
    throw new Error(
      "The Altering Cave spreadsheet returned no data.",
    );
  }

  const parsed = Papa.parse<string[]>(csv, {
    skipEmptyLines: false,
  });

  if (parsed.errors.length > 0) {
    console.warn(
      "Altering Cave CSV parsing warnings:",
      parsed.errors,
    );
  }

  const raw = parsed.data.map(normalizeRow);

  if (!raw.length) {
    throw new Error(
      "The Altering Cave spreadsheet contains no data.",
    );
  }

  console.log(
    "Altering Cave spreadsheet loaded:",
    raw.length,
    "rows",
  );

  /* =======================================================
     READ CURRENT SECTION
     ======================================================= */

  /*
   * CURRENT SINGLES
   *
   * A6:A10
   */
  const encounters = getColumnARange(
    raw,
    6,
    10,
  );

  /*
   * CURRENT RARE SINGLES
   *
   * A12:A13
   */
  const rareEncounters = getColumnARange(
    raw,
    12,
    13,
  );

  /*
   * CURRENT HORDES
   *
   * A15:A16
   */
  const hordes = getColumnARange(
    raw,
    15,
    16,
  );

  /* =======================================================
     FINAL DATA
     ======================================================= */

  const finalData: AlteringCaveData = {
    crystal: findCrystal(raw),
    encounters,
    rareEncounters,
    hordes,
    raw,
  };

  /* =======================================================
     DEBUG
     ======================================================= */

  console.log(
    "ALTERING CAVE PARSED:",
    finalData,
  );

  console.log(
    "CURRENT SINGLES A6:A10:",
    encounters,
  );

  console.log(
    "CURRENT RARE SINGLES A12:A13:",
    rareEncounters,
  );

  console.log(
    "CURRENT HORDES A15:A16:",
    hordes,
  );

  return finalData;
}