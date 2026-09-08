import Papa from "papaparse";

/* =========================================================
   GOOGLE SHEET
   ========================================================= */

const SHEET_ID =
  "12lZupylxLAKUVQQJZIC8GJmvQiUwpbAAQ3BduAu_rig";

const GID = "1031347870";

/*
 * We specifically request A6:A16.
 *
 * This is the Current Altering Cave section:
 *
 * A6:A10  = Singles
 * A11     = Rare Singles header
 * A12:A13 = Rare Singles
 * A14     = Hordes header
 * A15:A16 = Hordes
 */
const SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}&range=A6:A16`;


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
   NORMALIZE
   ========================================================= */

const normalize = (
  value: unknown,
): string =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();


const normalizeRow = (
  row: string[],
): string[] =>
  row.map(normalize);


/* =========================================================
   BLOCKED VALUES
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

  const lower =
    text.toLowerCase();

  if (
    BLOCKED_VALUES.has(lower)
  ) {
    return false;
  }

  if (
    /^rotation\s*\d+$/i.test(text)
  ) {
    return false;
  }

  if (
    /^tier\s*\d*$/i.test(text)
  ) {
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
   UNIQUE
   ========================================================= */

const unique = (
  items: string[],
): string[] =>
  [
    ...new Set(
      items
        .map(normalize)
        .filter(Boolean),
    ),
  ];


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
     FORCE FRESH DATA
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


  /* =======================================================
     READ CSV
     ======================================================= */

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
    "Altering Cave Current section loaded:",
    raw.length,
    "rows",
  );


  /* =======================================================
     DEBUG EXACT A6:A16 DATA
     ======================================================= */

  console.log(
    "==========================================",
  );

  console.log(
    "CURRENT ALTERING CAVE A6:A16",
  );

  console.log(
    "=========================================="
  );


  raw.forEach(
    (row, index) => {
      console.log(
        `Sheet Row ${index + 6}:`,
        row?.[0] ?? "",
      );
    },
  );


  /* =======================================================
     MAP CURRENT SECTION
     ======================================================= */

  /*
   * Because the request is ONLY A6:A16,
   * the returned array is now:

   * raw[0]  = A6
   * raw[1]  = A7
   * raw[2]  = A8
   * raw[3]  = A9
   * raw[4]  = A10
   *
   * raw[5]  = A11  (Rare Singles header)
   *
   * raw[6]  = A12
   * raw[7]  = A13
   *
   * raw[8]  = A14  (Hordes header)
   *
   * raw[9]  = A15
   * raw[10] = A16
   */


  /* =======================================================
     SINGLES
     ======================================================= */

  const encounters =
    unique(
      raw
        .slice(0, 5)
        .map(
          row => row?.[0] ?? "",
        )
        .filter(isPokemon),
    );


  /* =======================================================
     RARE SINGLES
     ======================================================= */

  const rareEncounters =
    unique(
      raw
        .slice(6, 8)
        .map(
          row => row?.[0] ?? "",
        )
        .filter(isPokemon),
    );


  /* =======================================================
     HORDES
     ======================================================= */

  const hordes =
    unique(
      raw
        .slice(9, 11)
        .map(
          row => row?.[0] ?? "",
        )
        .filter(isPokemon),
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
     FINAL RESULT
     ======================================================= */

  const finalData: AlteringCaveData = {
    crystal: "",
    encounters,
    rareEncounters,
    hordes,
    raw,
  };


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