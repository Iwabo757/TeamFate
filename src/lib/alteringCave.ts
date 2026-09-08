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
   NORMALIZATION
   ========================================================= */

const normalize = (value: unknown): string =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();


const normalizeRow = (
  row: string[],
): string[] => row.map(normalize);


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
   POKÉMON VALIDATION
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
   UNIQUE VALUES
   ========================================================= */

const unique = (
  items: string[],
): string[] => {
  return [
    ...new Set(
      items
        .map(normalize)
        .filter(Boolean),
    ),
  ];
};


/* =========================================================
   FIND A SECTION IN COLUMN A
   ========================================================= */

const findColumnASection = (
  rows: string[][],
  sectionName: string,
): number => {
  const target =
    sectionName.toLowerCase();

  for (
    let rowIndex = 0;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    const value =
      normalize(row[0]).toLowerCase();

    if (value === target) {
      return rowIndex;
    }
  }

  return -1;
};


/* =========================================================
   READ POKÉMON UNDER A SECTION
   ========================================================= */

/*
 * We only read COLUMN A.
 *
 * Example:
 *
 * Singles
 * Haxorus
 * Hydreigon
 * Petilil
 * Woobat
 * Rattata
 *
 * The function starts immediately after the section
 * heading and reads until another known section begins.
 */

const readSection = (
  rows: string[][],
  sectionRow: number,
  maximumPokemon: number,
): string[] => {
  if (sectionRow === -1) {
    return [];
  }

  const results: string[] = [];

  for (
    let rowIndex = sectionRow + 1;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    const value =
      normalize(row[0]);

    /*
     * Stop when we hit another section.
     */
    const lower =
      value.toLowerCase();

    if (
      lower === "singles" ||
      lower === "rare singles" ||
      lower === "hordes"
    ) {
      break;
    }

    /*
     * Ignore blank cells.
     */
    if (!value) {
      continue;
    }

    /*
     * Ignore non-Pokémon labels.
     */
    if (!isPokemon(value)) {
      continue;
    }

    results.push(value);

    /*
     * We know exactly how many Pokémon belong
     * to each Current section.
     */
    if (
      results.length >= maximumPokemon
    ) {
      break;
    }
  }

  return unique(results);
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
      const value =
        normalize(
          row[columnIndex],
        ).toLowerCase();

      if (value !== "crystal") {
        continue;
      }

      const nextValue =
        normalize(
          row[columnIndex + 1],
        );

      if (
        isPokemon(nextValue)
      ) {
        return nextValue;
      }
    }
  }

  return "";
};


/* =========================================================
   MAIN LOADER
   ========================================================= */

export async function getAlteringCaveData(): Promise<AlteringCaveData> {
  console.log(
    "==========================================",
  );

  console.log(
    "LOADING ALTERING CAVE SPREADSHEET...",
  );

  console.log(
    "==========================================",
  );


  /* =======================================================
     FRESH GOOGLE SHEETS REQUEST
     ======================================================= */

  const requestUrl =
    `${SHEET_URL}&_=${Date.now()}`;

  const response =
    await fetch(
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


  const csv =
    await response.text();


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

  const parsed =
    Papa.parse<string[]>(
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
    parsed.data.map(
      normalizeRow,
    );


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
     FIND CURRENT SECTION HEADERS
     ======================================================= */

  /*
   * IMPORTANT:
   *
   * We are ONLY looking at COLUMN A.
   *
   * We are NOT:
   *
   * - looking for ACTIVE
   * - looking for CURRENT
   * - scanning historical rotations
   * - reading columns B onward
   *
   * The Current section in column A is the source.
   */

  const singlesRow =
    findColumnASection(
      raw,
      "Singles",
    );

  const rareSinglesRow =
    findColumnASection(
      raw,
      "Rare Singles",
    );

  const hordesRow =
    findColumnASection(
      raw,
      "Hordes",
    );


  /* =======================================================
     DEBUG SECTION LOCATIONS
     ======================================================= */

  console.log(
    "CURRENT SECTION LOCATIONS:",
    {
      singlesRow,
      rareSinglesRow,
      hordesRow,
    },
  );


  /* =======================================================
     READ CURRENT SINGLES
     ======================================================= */

  /*
   * Expected:
   *
   * A6
   * A7
   * A8
   * A9
   * A10
   */

  const encounters =
    readSection(
      raw,
      singlesRow,
      5,
    );


  /* =======================================================
     READ CURRENT RARE SINGLES
     ======================================================= */

  /*
   * Expected:
   *
   * A12
   * A13
   */

  const rareEncounters =
    readSection(
      raw,
      rareSinglesRow,
      2,
    );


  /* =======================================================
     READ CURRENT HORDES
     ======================================================= */

  /*
   * Expected:
   *
   * A15
   * A16
   */

  const hordes =
    readSection(
      raw,
      hordesRow,
      2,
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
    "SINGLES:",
    encounters,
  );

  console.log(
    "RARE SINGLES:",
    rareEncounters,
  );

  console.log(
    "HORDES:",
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
    "ALTERING CAVE PARSED:",
    finalData,
  );


  console.log(
    "==========================================",
  );


  return finalData;
}