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
   NORMALIZATION
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

const isPokemon = (value: string): boolean => {
  const text = normalize(value);

  if (!text) {
    return false;
  }

  const lower = text.toLowerCase();

  if (BLOCKED_VALUES.has(lower)) {
    return false;
  }

  if (/^rotation\s*\d+$/i.test(text)) {
    return false;
  }

  if (/^tier\s*\d*$/i.test(text)) {
    return false;
  }

  /*
   * Filters labels such as:
   *
   * Zorua (All Hordes)
   *
   * We only want the actual Pokémon names.
   */
  if (text.includes("(") || text.includes(")")) {
    return false;
  }

  return true;
};

/* =========================================================
   FIND A ROW CONTAINING AN EXACT VALUE
   ========================================================= */

const findExactRow = (
  rows: string[][],
  value: string,
  start: number,
  end: number,
): number => {
  const target = value.toLowerCase();

  for (
    let rowIndex = start;
    rowIndex < end;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    for (
      let columnIndex = 0;
      columnIndex < row.length;
      columnIndex++
    ) {
      if (
        normalize(row[columnIndex]).toLowerCase() ===
        target
      ) {
        return rowIndex;
      }
    }
  }

  return -1;
};

/* =========================================================
   FIND THE CURRENT ACTIVE COLUMN
   ========================================================= */

/*
 * IMPORTANT:
 *
 * The ACTIVE marker is in the control/header area
 * ABOVE the Current section.
 *
 * We intentionally DO NOT:
 *
 * - read the "Current" section in column A
 * - scan every historical rotation
 * - choose the first Pokémon column
 *
 * We simply find the column that the spreadsheet
 * marks as ACTIVE.
 */
const findActiveColumns = (
  rows: string[][],
): number[] => {
  const columns = new Set<number>();

  /*
   * The sheet places the ACTIVE marker near the top.
   *
   * Zero-based indexes:
   *
   * Sheet row 1 = index 0
   * Sheet row 2 = index 1
   * Sheet row 3 = index 2
   * Sheet row 4 = index 3
   *
   * Check those first four rows.
   */
  const controlEnd = Math.min(4, rows.length);

  for (
    let rowIndex = 0;
    rowIndex < controlEnd;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    row.forEach((cell, columnIndex) => {
      const value = normalize(cell).toLowerCase();

      if (value === "active") {
        columns.add(columnIndex);
      }
    });
  }

  return [...columns].sort(
    (a, b) => a - b,
  );
};

/* =========================================================
   GET POKÉMON FROM SELECTED COLUMNS
   ========================================================= */

const getSectionPokemon = (
  rows: string[][],
  start: number,
  end: number,
  columns: number[],
): string[] => {
  const pokemon: string[] = [];

  for (
    let rowIndex = start;
    rowIndex < end;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    for (const columnIndex of columns) {
      const value = normalize(
        row[columnIndex],
      );

      if (isPokemon(value)) {
        pokemon.push(value);
      }
    }
  }

  return unique(pokemon);
};

/* =========================================================
   FIND CRYSTAL
   ========================================================= */

const findCrystal = (
  rows: string[][],
): string => {
  for (const row of rows) {
    for (
      let columnIndex = 0;
      columnIndex < row.length;
      columnIndex++
    ) {
      const value = normalize(
        row[columnIndex],
      ).toLowerCase();

      if (value === "crystal") {
        const nextValue = normalize(
          row[columnIndex + 1],
        );

        if (isPokemon(nextValue)) {
          return nextValue;
        }
      }
    }
  }

  return "";
};

/* =========================================================
   MAIN ALTERING CAVE LOADER
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
     CURRENT SECTION

     These row locations are only used to identify the
     Singles / Rare Singles / Hordes boundaries.

     They are NOT used to determine which rotation is active.
     ======================================================= */

  const SECTION_START = 3;

  const SECTION_END = Math.min(
    16,
    raw.length,
  );

  /* =======================================================
     FIND SECTION HEADERS
     ======================================================= */

  const singlesRow = findExactRow(
    raw,
    "singles",
    SECTION_START,
    SECTION_END,
  );

  const rareSinglesRow = findExactRow(
    raw,
    "rare singles",
    SECTION_START,
    SECTION_END,
  );

  const hordesRow = findExactRow(
    raw,
    "hordes",
    SECTION_START,
    SECTION_END,
  );

  console.log(
    "Section rows:",
    {
      singlesRow,
      rareSinglesRow,
      hordesRow,
    },
  );

  /* =======================================================
     FIND ACTIVE COLUMN
     ======================================================= */

  let activeColumns = findActiveColumns(raw);

  /*
   * Fallback:
   *
   * If Google Sheets does not preserve the ACTIVE marker
   * in the CSV response, use the first populated Pokémon
   * column from the Singles section.
   *
   * This preserves the original behavior of the parser
   * without reading every historical rotation.
   */
  if (
    !activeColumns.length &&
    singlesRow !== -1
  ) {
    const columns = new Set<number>();

    const searchEnd =
      rareSinglesRow !== -1
        ? rareSinglesRow
        : SECTION_END;

    for (
      let rowIndex = singlesRow + 1;
      rowIndex < searchEnd;
      rowIndex++
    ) {
      const row = raw[rowIndex];

      if (!row) {
        continue;
      }

      /*
       * Skip column A because that is the Current section.
       */
      for (
        let columnIndex = 1;
        columnIndex < row.length;
        columnIndex++
      ) {
        if (
          isPokemon(row[columnIndex])
        ) {
          columns.add(columnIndex);
        }
      }
    }

    /*
     * Only use the first populated column.
     *
     * This prevents all historical rotation columns
     * from being read.
     */
    const firstColumn =
      [...columns].sort(
        (a, b) => a - b,
      )[0];

    if (
      firstColumn !== undefined
    ) {
      activeColumns = [firstColumn];

      console.warn(
        "ACTIVE marker was not found. Using fallback column:",
        firstColumn,
      );
    }
  }

  /* =======================================================
     DEBUGGING
     ======================================================= */

  if (!activeColumns.length) {
    console.warn(
      "Could not find the current Altering Cave column.",
    );
  }

  console.log(
    "ACTIVE COLUMNS:",
    activeColumns,
  );

  /* =======================================================
     SINGLES
     ======================================================= */

  const encounters =
    singlesRow !== -1
      ? getSectionPokemon(
          raw,
          singlesRow + 1,
          rareSinglesRow !== -1
            ? rareSinglesRow
            : SECTION_END,
          activeColumns,
        )
      : [];

  /* =======================================================
     RARE SINGLES
     ======================================================= */

  const rareEncounters =
    rareSinglesRow !== -1
      ? getSectionPokemon(
          raw,
          rareSinglesRow + 1,
          hordesRow !== -1
            ? hordesRow
            : SECTION_END,
          activeColumns,
        )
      : [];

  /* =======================================================
     HORDES
     ======================================================= */

  const hordes =
    hordesRow !== -1
      ? getSectionPokemon(
          raw,
          hordesRow + 1,
          SECTION_END,
          activeColumns,
        )
      : [];

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
     DEBUG OUTPUT
     ======================================================= */

  console.log(
    "ALTERING CAVE PARSED:",
    finalData,
  );

  console.log(
    "ACTIVE COLUMNS:",
    activeColumns,
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

  return finalData;
}