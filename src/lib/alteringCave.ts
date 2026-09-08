import Papa from "papaparse";

/* =========================================================
   GOOGLE SHEET
   ========================================================= */

const SHEET_ID =
  "12lZupylxLAKUVQQJZIC8GJmvQiUwpbAAQ3BduAu_rig";

const GID = "1031347870";

const SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;


/* =========================================================
   DATA TYPE
   ========================================================= */

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


const normalizeRow = (
  row: string[],
): string[] =>
  row.map(normalize);


const unique = (
  items: string[],
): string[] =>
  [...new Set(
    items
      .map(normalize)
      .filter(Boolean),
  )];


/* =========================================================
   VALUES THAT ARE NOT POKÉMON
   ========================================================= */

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


/* =========================================================
   POKÉMON CHECK
   ========================================================= */

const isPokemon = (
  value: string,
): boolean => {
  const text = normalize(value);

  if (!text) {
    return false;
  }

  const lower = text.toLowerCase();

  if (BLOCKED_VALUES.has(lower)) {
    return false;
  }

  /*
   * Ignore rotation labels.
   */
  if (
    /^rotation\s*\d+$/i.test(text)
  ) {
    return false;
  }

  /*
   * Ignore tier labels.
   */
  if (
    /^tier\s*\d*$/i.test(text)
  ) {
    return false;
  }

  /*
   * Ignore special labels such as:
   *
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
   READ COLUMN A RANGE
   ========================================================= */

/*
 * Spreadsheet rows are 1-based.
 *
 * Therefore:
 *
 * A6  = raw[5][0]
 * A7  = raw[6][0]
 * A8  = raw[7][0]
 * A9  = raw[8][0]
 * A10 = raw[9][0]
 *
 * A12 = raw[11][0]
 * A13 = raw[12][0]
 *
 * A15 = raw[14][0]
 * A16 = raw[15][0]
 */

const getColumnARange = (
  rows: string[][],
  startRow: number,
  endRow: number,
): string[] => {
  const values: string[] = [];

  for (
    let sheetRow = startRow;
    sheetRow <= endRow;
    sheetRow++
  ) {
    const arrayIndex = sheetRow - 1;

    const row = rows[arrayIndex];

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
   DEBUG COLUMN A
   ========================================================= */

const getCurrentColumnADebug = (
  rows: string[][],
) => {
  const debugRows: Array<{
    sheetRow: number;
    value: string;
  }> = [];

  for (
    let sheetRow = 6;
    sheetRow <= 16;
    sheetRow++
  ) {
    const arrayIndex = sheetRow - 1;

    const row = rows[arrayIndex];

    debugRows.push({
      sheetRow,
      value: normalize(
        row?.[0] ?? "",
      ),
    });
  }

  return debugRows;
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
   LOAD ALTERING CAVE
   ========================================================= */

export async function getAlteringCaveData(): Promise<AlteringCaveData> {
  console.log(
    "==========================================",
  );

  console.log(
    "LOADING ALTERING CAVE SPREADSHEET",
  );

  console.log(
    "==========================================",
  );

  /*
   * Cache bust the Google Sheets request.
   *
   * The timestamp makes every request a unique URL,
   * preventing an old CSV response from being reused.
   */
  const requestUrl =
    `${SHEET_URL}&_=${Date.now()}`;

  const response = await fetch(
    requestUrl,
    {
      cache: "no-store",
    },
  );

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

  console.log(
    "Altering Cave CSV received:",
    csv.length,
    "characters",
  );


  /* =======================================================
     PARSE CSV
     ======================================================= */

  const parsed = Papa.parse<string[]>(
    csv,
    {
      skipEmptyLines: false,
    },
  );

  if (
    parsed.errors &&
    parsed.errors.length > 0
  ) {
    console.warn(
      "Altering Cave CSV parsing warnings:",
      parsed.errors,
    );
  }

  const raw =
    parsed.data.map(normalizeRow);

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
     DEBUG CURRENT SECTION
     ======================================================= */

  const currentColumnA =
    getCurrentColumnADebug(raw);

  console.log(
    "==========================================",
  );

  console.log(
    "CURRENT ALTERING CAVE - COLUMN A",
  );

  console.log(
    "==========================================",
  );

  console.table(
    currentColumnA,
  );


  /* =======================================================
     CURRENT SINGLES
     ======================================================= */

  /*
   * A6:A10
   */

  const encounters =
    getColumnARange(
      raw,
      6,
      10,
    );


  /* =======================================================
     CURRENT RARE SINGLES
     ======================================================= */

  /*
   * A12:A13
   */

  const rareEncounters =
    getColumnARange(
      raw,
      12,
      13,
    );


  /* =======================================================
     CURRENT HORDES
     ======================================================= */

  /*
   * A15:A16
   */

  const hordes =
    getColumnARange(
      raw,
      15,
      16,
    );


  /* =======================================================
     DEBUG RESULTS
     ======================================================= */

  console.log(
    "==========================================",
  );

  console.log(
    "CURRENT ALTERING CAVE RESULTS",
  );

  console.log(
    "==========================================",
  );

  console.log(
    "SINGLES A6:A10:",
    encounters,
  );

  console.log(
    "RARE SINGLES A12:A13:",
    rareEncounters,
  );

  console.log(
    "HORDES A15:A16:",
    hordes,
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
     FINAL DEBUG
     ======================================================= */

  console.log(
    "==========================================",
  );

  console.log(
    "ALTERING CAVE PARSED:",
    finalData,
  );

  console.log(
    "==========================================",
  );


  return finalData;
}