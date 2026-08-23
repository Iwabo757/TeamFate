import Papa from "papaparse";

const SHEET_ID =
  "12lZupylxLAKUVQQJZIC8GJmvQiUwpbAAQ3BduAu_rig";

const GID = "1031347870";

const SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

export interface AlteringCaveData {
  crystal: string;
  encounters: string[];
  rareEncounters: string[];
  hordes: string[];
  raw: string[][];
}

const normalize = (value: unknown): string =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeRow = (row: string[]): string[] =>
  row.map(normalize);

const unique = (items: string[]): string[] =>
  [...new Set(items.map(normalize).filter(Boolean))];

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

const findExactRow = (
  rows: string[][],
  value: string,
  start: number,
  end: number,
): number => {
  const target = value.toLowerCase();

  for (let rowIndex = start; rowIndex < end; rowIndex++) {
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

const findActiveColumns = (
  rows: string[][],
  start: number,
  end: number,
): number[] => {
  const columns = new Set<number>();

  for (let rowIndex = start; rowIndex < end; rowIndex++) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    row.forEach((cell, columnIndex) => {
      const value = normalize(cell).toLowerCase();

      if (
        value === "active" ||
        value === "current"
      ) {
        columns.add(columnIndex);
      }
    });
  }

  return [...columns];
};

const getSectionPokemon = (
  rows: string[][],
  start: number,
  end: number,
  columns: number[],
): string[] => {
  const pokemon: string[] = [];

  for (let rowIndex = start; rowIndex < end; rowIndex++) {
    const row = rows[rowIndex];

    if (!row) {
      continue;
    }

    for (const columnIndex of columns) {
      const value = normalize(row[columnIndex]);

      if (isPokemon(value)) {
        pokemon.push(value);
      }
    }
  }

  return unique(pokemon);
};

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

export async function getAlteringCaveData(): Promise<AlteringCaveData> {
  const response = await fetch(SHEET_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to load Altering Cave data: ${response.status}`,
    );
  }

  const csv = await response.text();

  const parsed = Papa.parse<string[]>(csv, {
    skipEmptyLines: false,
  });

  const raw = parsed.data.map(normalizeRow);

  if (!raw.length) {
    throw new Error(
      "The Altering Cave spreadsheet contains no data.",
    );
  }

  /*
   * Google Sheet structure:
   *
   * Row 4  = Singles title
   * Row 5+ = Singles Pokémon
   *
   * Row 11 = Rare Singles title
   * Row 12+ = Rare Singles Pokémon
   *
   * Row 14 = Hordes title
   * Row 15+ = Horde Pokémon
   *
   * Array indexes are zero-based, so:
   *
   * Sheet Row 4  = index 3
   * Sheet Row 11 = index 10
   * Sheet Row 14 = index 13
   */

  const SECTION_START = 3;
  const SECTION_END = Math.min(
    16,
    raw.length,
  );

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

  /*
   * Find the column marked ACTIVE or CURRENT.
   *
   * We search the current Altering Cave section
   * instead of scanning the entire spreadsheet.
   */
  let activeColumns = findActiveColumns(
    raw,
    SECTION_START,
    SECTION_END,
  );

  /*
   * Fallback:
   *
   * If the CSV does not contain an ACTIVE/CURRENT
   * marker, use populated columns from the Singles
   * data while ignoring column A.
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

      for (
        let columnIndex = 1;
        columnIndex < row.length;
        columnIndex++
      ) {
        if (isPokemon(row[columnIndex])) {
          columns.add(columnIndex);
        }
      }
    }

    /*
     * Only use the first populated column as a fallback.
     * This prevents every rotation column from being read.
     */
    const firstColumn =
      [...columns].sort((a, b) => a - b)[0];

    if (firstColumn !== undefined) {
      activeColumns = [firstColumn];
    }
  }

  if (!activeColumns.length) {
    console.warn(
      "Could not find the current Altering Cave column.",
    );
  }

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

  const hordes =
    hordesRow !== -1
      ? getSectionPokemon(
          raw,
          hordesRow + 1,
          SECTION_END,
          activeColumns,
        )
      : [];

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