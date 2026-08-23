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

const normalize = (value: unknown): string =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeRow = (row: string[]): string[] =>
  row.map(normalize);

const rowText = (row: string[]): string =>
  normalizeRow(row)
    .join(" ")
    .toLowerCase();

const unique = (items: string[]): string[] =>
  [...new Set(items.map(normalize).filter(Boolean))];

const BLOCKED_VALUES = new Set([
  "",
  "active",
  "current",
  "singles",
  "single",
  "tier",
  "rotation",
  "encounter",
  "encounters",
  "horde",
  "hordes",
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

const isRotationHeader = (value: string): boolean =>
  /^rotation\s*\d+$/i.test(normalize(value));

const isTierValue = (value: string): boolean =>
  /^tier\s*\d*$/i.test(normalize(value));

const isMetadata = (value: string): boolean => {
  const text = normalize(value).toLowerCase();

  if (!text) {
    return true;
  }

  if (BLOCKED_VALUES.has(text)) {
    return true;
  }

  if (isRotationHeader(text)) {
    return true;
  }

  if (isTierValue(text)) {
    return true;
  }

  if (
    text.includes("brought to you") ||
    text.includes("creator") ||
    text.includes("editor") ||
    text.includes("using this data") ||
    text.includes("discord") ||
    text.includes("ign:")
  ) {
    return true;
  }

  return false;
};

const isPokemonValue = (value: string): boolean =>
  !isMetadata(value);

const isHordeLabel = (value: string): boolean =>
  normalize(value)
    .toLowerCase()
    .includes("horde");

const isEncounterLabel = (value: string): boolean => {
  const text = normalize(value).toLowerCase();

  return (
    text.includes("encounter") ||
    text.includes("single")
  );
};

const findHeaderRow = (
  rows: string[][],
): number =>
  rows.findIndex((row) => {
    const text = rowText(row);

    return (
      text.includes("singles") &&
      text.includes("tier") &&
      text.includes("rotation")
    );
  });

const findRotationColumns = (
  headerRow: string[],
): number[] => {
  const columns: number[] = [];

  headerRow.forEach((value, index) => {
    if (isRotationHeader(value)) {
      columns.push(index);
    }
  });

  return columns;
};

const findColumnType = (
  rows: string[][],
  column: number,
): "encounter" | "horde" => {
  for (const row of rows) {
    const value = normalize(row[column]);

    if (isHordeLabel(value)) {
      return "horde";
    }

    if (isEncounterLabel(value)) {
      return "encounter";
    }
  }

  return "encounter";
};

const getTableEnd = (
  rows: string[][],
  startIndex: number,
): number => {
  let emptyRows = 0;

  for (
    let index = startIndex;
    index < rows.length;
    index++
  ) {
    const row = rows[index];

    const isEmpty = row.every(
      (cell) => !normalize(cell),
    );

    if (isEmpty) {
      emptyRows++;

      if (emptyRows >= 3) {
        return index - 2;
      }
    } else {
      emptyRows = 0;
    }
  }

  return rows.length;
};

const findCrystal = (
  rows: string[][],
  headerRowIndex: number,
): string => {
  const searchStart = Math.max(
    0,
    headerRowIndex - 10,
  );

  const searchEnd = Math.min(
    rows.length,
    headerRowIndex + 5,
  );

  for (
    let rowIndex = searchStart;
    rowIndex < searchEnd;
    rowIndex++
  ) {
    const row = rows[rowIndex];

    for (
      let column = 0;
      column < row.length;
      column++
    ) {
      const value = normalize(row[column]);

      if (
        value.toLowerCase() === "crystal"
      ) {
        const nextValue = normalize(
          row[column + 1],
        );

        if (isPokemonValue(nextValue)) {
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

  const headerRowIndex = findHeaderRow(raw);

  if (headerRowIndex === -1) {
    console.warn(
      "Could not find the Altering Cave rotation table.",
    );

    return {
      crystal: "",
      encounters: [],
      hordes: [],
      raw,
    };
  }

  const headerRow = raw[headerRowIndex];

  const rotationColumns =
    findRotationColumns(headerRow);

  if (!rotationColumns.length) {
    console.warn(
      "Could not find any rotation columns.",
    );

    return {
      crystal: findCrystal(
        raw,
        headerRowIndex,
      ),
      encounters: [],
      hordes: [],
      raw,
    };
  }

  const tableStart =
    headerRowIndex + 1;

  const tableEnd = getTableEnd(
    raw,
    tableStart,
  );

  const tableRows = raw.slice(
    tableStart,
    tableEnd,
  );

  const encounters: string[] = [];
  const hordes: string[] = [];

  const columnTypes = new Map<
    number,
    "encounter" | "horde"
  >();

  rotationColumns.forEach((column) => {
    columnTypes.set(
      column,
      findColumnType(
        raw.slice(
          Math.max(
            0,
            headerRowIndex - 5,
          ),
          headerRowIndex + 1,
        ),
        column,
      ),
    );
  });

  for (const row of tableRows) {
    const rowValues = normalizeRow(row);

    const rowTextValue =
      rowText(rowValues);

    const rowIsHorde =
      rowTextValue.includes("horde");

    const rowIsEncounter =
      rowTextValue.includes(
        "encounter",
      ) ||
      rowTextValue.includes(
        "single",
      );

    for (const column of rotationColumns) {
      const value = normalize(
        rowValues[column],
      );

      if (!isPokemonValue(value)) {
        continue;
      }

      const columnType =
        columnTypes.get(column) ??
        "encounter";

      if (
        rowIsHorde ||
        columnType === "horde"
      ) {
        hordes.push(value);
        continue;
      }

      if (
        rowIsEncounter ||
        columnType === "encounter"
      ) {
        encounters.push(value);
      }
    }
  }

  const crystal = findCrystal(
    raw,
    headerRowIndex,
  );

  const finalData: AlteringCaveData = {
    crystal,
    encounters: unique(encounters),
    hordes: unique(hordes),
    raw,
  };

  console.log(
    "ALTERING CAVE PARSED:",
    finalData,
  );

  return finalData;
}