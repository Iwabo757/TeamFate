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
   * Ignore labels such as:
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
): string[] => [
  ...new Set(
    items
      .map(normalize)
      .filter(Boolean),
  ),
];


/* =========================================================
   FIND CURRENT ROW
   ========================================================= */

const findCurrentRow = (
  rows: string[][],
): number => {
  for (
    let rowIndex = 0;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    /*
     * IMPORTANT:
     *
     * Current must specifically be in COLUMN A.
     */
    const value =
      normalize(row[0]).toLowerCase();

    if (value === "current") {
      return rowIndex;
    }
  }

  return -1;
};


/* =========================================================
   FIND SECTION AFTER CURRENT
   ========================================================= */

const findSectionAfter = (
  rows: string[][],
  sectionName: string,
  startRow: number,
): number => {
  const target =
    sectionName.toLowerCase();

  for (
    let rowIndex = startRow;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    /*
     * ONLY COLUMN A.
     */
    const value =
      normalize(row[0]).toLowerCase();

    if (value === target) {
      return rowIndex;
    }

    /*
     * If we hit a historical rotation header before
     * finding the requested section, stop.
     */
    if (
      /^rotation\s*\d+$/i.test(value)
    ) {
      break;
    }
  }

  return -1;
};


/* =========================================================
   READ CURRENT SECTION
   ========================================================= */

const readCurrentSection = (
  rows: string[][],
  sectionRow: number,
  nextSectionRow: number,
  expectedCount: number,
): string[] => {
  if (sectionRow === -1) {
    return [];
  }

  const results: string[] = [];

  /*
   * Only read between this section and the next section.
   *
   * This prevents us from accidentally pulling Pokémon
   * from another category.
   */
  const end =
    nextSectionRow !== -1
      ? nextSectionRow
      : rows.length;

  for (
    let rowIndex = sectionRow + 1;
    rowIndex < end;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    /*
     * ONLY COLUMN A.
     */
    const value =
      normalize(row[0]);

    if (!value) {
      continue;
    }

    if (!isPokemon(value)) {
      continue;
    }

    results.push(value);

    /*
     * Singles = 5
     * Rare Singles = 2
     * Hordes = 2
     */
    if (
      results.length >= expectedCount
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
   LOAD ALTERING CAVE DATA
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
     FRESH REQUEST
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
     FIND CURRENT SECTION
     ======================================================= */

  const currentRow =
    findCurrentRow(raw);


  console.log(
    "CURRENT ROW:",
    currentRow,
  );


  if (currentRow === -1) {
    throw new Error(
      "Could not find the Current Altering Cave section in column A.",
    );
  }


  /* =======================================================
     FIND CURRENT CATEGORY HEADERS
     ======================================================= */

  const singlesRow =
    findSectionAfter(
      raw,
      "Singles",
      currentRow + 1,
    );


  const rareSinglesRow =
    findSectionAfter(
      raw,
      "Rare Singles",
      currentRow + 1,
    );


  const hordesRow =
    findSectionAfter(
      raw,
      "Hordes",
      currentRow + 1,
    );


  console.log(
    "CURRENT SECTION LOCATIONS:",
    {
      currentRow,
      singlesRow,
      rareSinglesRow,
      hordesRow,
    },
  );


  /* =======================================================
     READ SINGLES
     ======================================================= */

  const encounters =
    readCurrentSection(
      raw,
      singlesRow,
      rareSinglesRow,
      5,
    );


  /* =======================================================
     READ RARE SINGLES
     ======================================================= */

  const rareEncounters =
    readCurrentSection(
      raw,
      rareSinglesRow,
      hordesRow,
      2,
    );


  /* =======================================================
     READ HORDES
     ======================================================= */

  const hordes =
    readCurrentSection(
      raw,
      hordesRow,
      -1,
      2,
    );


  /* =======================================================
     DEBUG
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
     FINAL RESULT
     ======================================================= */

  const finalData: AlteringCaveData = {
    crystal: findCrystal(raw),
    encounters,
    rareEncounters,
    hordes,
    raw,
  };


  console.log(
    "ALTERING CAVE PARSED:",
    finalData,
  );


  return finalData;
}