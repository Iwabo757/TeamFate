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

const isPokemon = (value: string): boolean => {
  const text = normalize(value);

  if (!text) return false;

  const blocked = new Set([
    "active",
    "current",
    "singles",
    "rare singles",
    "rare single",
    "hordes",
    "horde",
    "tier",
    "rotation",
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

  const lower = text.toLowerCase();

  if (blocked.has(lower)) return false;

  if (/^rotation\s*\d+$/i.test(text)) {
    return false;
  }

  if (/^tier\s*\d*$/i.test(text)) {
    return false;
  }

  return true;
};

const findRow = (
  rows: string[][],
  text: string,
  start = 0,
  end = rows.length,
): number => {
  const target = text.toLowerCase();

  for (let index = start; index < end; index++) {
    const firstCell = normalize(rows[index]?.[0]).toLowerCase();

    if (firstCell === target) {
      return index;
    }
  }

  return -1;
};

const getSectionValues = (
  rows: string[][],
  start: number,
  end: number,
  activeColumns: number[],
): string[] => {
  const values: string[] = [];

  for (let rowIndex = start; rowIndex < end; rowIndex++) {
    const row = rows[rowIndex];

    if (!row) continue;

    for (const columnIndex of activeColumns) {
      const value = normalize(row[columnIndex]);

      if (isPokemon(value)) {
        values.push(value);
      }
    }
  }

  return unique(values);
};

const findActiveColumns = (
  rows: string[][],
  sectionStart: number,
): number[] => {
  const columns = new Set<number>();

  /*
   * Search the rows immediately above the current
   * Altering Cave table for ACTIVE / CURRENT markers.
   */
  const searchStart = Math.max(0, sectionStart - 5);

  for (
    let rowIndex = searchStart;
    rowIndex < sectionStart;
    rowIndex++
  ) {
    const row = rows[rowIndex];

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

  /*
   * If the sheet does not explicitly export ACTIVE
   * markers in CSV, fall back to the first populated
   * encounter column after column A.
   */
  if (!columns.size) {
    for (
      let rowIndex = sectionStart;
      rowIndex < Math.min(rows.length, sectionStart + 3);
      rowIndex++
    ) {
      const row = rows[rowIndex];

      for (
        let columnIndex = 1;
        columnIndex < row.length;
        columnIndex++
      ) {
        if (normalize(row[columnIndex])) {
          columns.add(columnIndex);
        }
      }

      if (columns.size) {
        break;
      }
    }
  }

  return [...columns];
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
      if (
        normalize(row[columnIndex])
          .toLowerCase() === "crystal"
      ) {
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

  /*
   * Spreadsheet rows are zero-indexed here.
   *
   * Sheet structure:
   *
   * A4  = Current Altering Cave area
   * A5  = Singles
   * A11 = Rare Singles
   * A14 = Hordes
   *
   * We only care about A4 through A16.
   */

  const currentStart = 3;
  const currentEnd = Math.min(16, raw.length);

  const currentRows = raw.slice(
    currentStart,
    currentEnd,
  );

  if (!currentRows.length) {
    return {
      crystal: "",
      encounters: [],
      rareEncounters: [],
      hordes: [],
      raw,
    };
  }

  const singlesRow =
    findRow(
      raw,
      "singles",
      currentStart,
      currentEnd,
    );

  const rareSinglesRow =
    findRow(
      raw,
      "rare singles",
      currentStart,
      currentEnd,
    );

  const hordesRow =
    findRow(
      raw,
      "hordes",
      currentStart,
      currentEnd,
    );

  if (singlesRow === -1) {
    console.warn(
      "Could not find the Singles section.",
    );
  }

  if (rareSinglesRow === -1) {
    console.warn(
      "Could not find the Rare Singles section.",
    );
  }

  if (hordesRow === -1) {
    console.warn(
      "Could not find the Hordes section.",
    );
  }

  const activeColumns = findActiveColumns(
    raw,
    singlesRow !== -1
      ? singlesRow
      : currentStart,
  );

  /*
   * Singles:
   * From the row after "Singles"
   * until "Rare Singles".
   */
  const encounters =
    singlesRow !== -1
      ? getSectionValues(
          raw,
          singlesRow + 1,
          rareSinglesRow !== -1
            ? rareSinglesRow
            : currentEnd,
          activeColumns,
        )
      : [];

  /*
   * Rare Singles:
   * From the row after "Rare Singles"
   * until "Hordes".
   */
  const rareEncounters =
    rareSinglesRow !== -1
      ? getSectionValues(
          raw,
          rareSinglesRow + 1,
          hordesRow !== -1
            ? hordesRow
            : currentEnd,
          activeColumns,
        )
      : [];

  /*
   * Hordes:
   * From the row after "Hordes"
   * until the end of the current section.
   */
  const hordes =
    hordesRow !== -1
      ? getSectionValues(
          raw,
          hordesRow + 1,
          currentEnd,
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