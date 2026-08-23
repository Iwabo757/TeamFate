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
  normalizeRow(row).join(" ").toLowerCase();

const unique = (items: string[]): string[] =>
  [...new Set(items.map(normalize).filter(Boolean))];

/*
 * Values that belong to the spreadsheet structure
 * and should never be returned as Pokémon.
 */
const BLOCKED_VALUES = new Set([
  "",
  "active",
  "current",
  "singles",
  "tier",
  "rotation",
  "rotation 1",
  "rotation 2",
  "rotation 3",
  "rotation 4",
  "rotation 5",
  "rotation 6",
  "encounter",
  "encounters",
  "horde",
  "hordes",
  "crystal",
  "type",
  "types",
  "pokemon",
  "pokémon",
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

const isDataValue = (value: string): boolean => {
  const text = normalize(value);

  if (!text) return false;

  const lower = text.toLowerCase();

  if (BLOCKED_VALUES.has(lower)) {
    return false;
  }

  /*
   * Exclude labels such as:
   * Rotation 1
   * Tier 2
   * etc.
   */
  if (
    /^rotation\s*\d*$/i.test(text) ||
    /^tier\s*\d*$/i.test(text)
  ) {
    return false;
  }

  /*
   * Ignore obvious metadata.
   */
  if (
    lower.includes("brought to you") ||
    lower.includes("creator") ||
    lower.includes("editor") ||
    lower.includes("using this data") ||
    lower.includes("discord") ||
    lower.includes("ign:")
  ) {
    return false;
  }

  return true;
};

const isRotationHeader = (value: string): boolean =>
  /^rotation\s*\d+$/i.test(normalize(value));

const isHordeLabel = (value: string): boolean =>
  normalize(value).toLowerCase().includes("horde");

const isEncounterLabel = (value: string): boolean => {
  const lower = normalize(value).toLowerCase();

  return (
    lower.includes("encounter") ||
    lower.includes("single")
  );
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
   * Find the actual rotation header.
   *
   * From your spreadsheet structure this is the row
   * containing values like:
   *
   * Singles | Tier | Rotation 1 | ...
   */
  const headerRowIndex = raw.findIndex((row) => {
    const text = rowText(row);

    return (
      text.includes("singles") &&
      text.includes("tier") &&
      text.includes("rotation")
    );
  });

  if (headerRowIndex === -1) {
    console.warn(
      "Could not locate Altering Cave rotation headers.",
    );

    return {
      crystal: "",
      encounters: [],
      hordes: [],
      raw,
    };
  }

  const headerRow = raw[headerRowIndex];

  /*
   * Locate all rotation columns.
   */
  const rotationColumns: number[] = [];

  headerRow.forEach((cell, index) => {
    if (isRotationHeader(cell)) {
      rotationColumns.push(index);
    }
  });

  /*
   * If the sheet currently only exposes a single
   * Rotation column in a slightly different format,
   * fall back to any column containing "rotation".
   */
  if (!rotationColumns.length) {
    headerRow.forEach((cell, index) => {
      if (normalize(cell).toLowerCase().includes("rotation")) {
        rotationColumns.push(index);
      }
    });
  }

  /*
   * Determine where the actual data starts.
   */
  const dataStart = headerRowIndex + 1;

  /*
   * Find the end of this table.
   *
   * We stop after a substantial run of completely empty
   * rows instead of accidentally parsing the next sheet section.
   */
  let dataEnd = raw.length;
  let emptyRows = 0;

  for (let i = dataStart; i < raw.length; i++) {
    const row = raw[i];

    if (row.every((cell) => !normalize(cell))) {
      emptyRows++;

      if (emptyRows >= 3) {
        dataEnd = i - 2;
        break;
      }
    } else {
      emptyRows = 0;
    }
  }

  const tableRows = raw.slice(
    dataStart,
    dataEnd,
  );

  const encounters: string[] = [];
  const hordes: string[] = [];
  let crystal = "";

  /*
   * Find useful labels in the header area.
   *
   * Some versions of the spreadsheet may use nearby rows
   * to label encounter / horde columns.
   */
  const contextRows = raw.slice(
    Math.max(0, headerRowIndex - 3),
    headerRowIndex + 1,
  );

  /*
   * Build column metadata.
   */
  const columnTypes = new Map<
    number,
    "encounter" | "horde" | "unknown"
  >();

  rotationColumns.forEach((column) => {
    let type: "encounter" | "horde" | "unknown" =
      "unknown";

    for (const contextRow of contextRows) {
      const value = normalize(contextRow[column]);

      if (isHordeLabel(value)) {
        type = "horde";
        break;
      }

      if (isEncounterLabel(value)) {
        type = "encounter";
      }
    }

    columnTypes.set(column, type);
  });

  /*
   * Parse only the rotation columns.
   */
  for (const row of tableRows) {
    const rowValues = normalizeRow(row);

    /*
     * Check for row labels that may identify
     * encounter or horde sections.
     */
    const rowLabel = rowValues.find((value) => {
      const lower = value.toLowerCase();

      return (
        lower === "encounters" ||
        lower === "encounter" ||
        lower === "hordes" ||
        lower === "horde" ||
        lower === "crystal"
      );
    });

    const rowIsHorde =
      rowLabel !== undefined &&
      isHordeLabel(rowLabel);

    const rowIsEncounter =
      rowLabel !== undefined &&
      isEncounterLabel(rowLabel);

    const rowIsCrystal =
      rowLabel !== undefined &&
      normalize(rowLabel).toLowerCase() === "crystal";

    for (const column of rotationColumns) {
      const value = normalize(rowValues[column]);

      if (!isDataValue(value)) {
        continue;
      }

      if (rowIsCrystal && !crystal) {
        crystal = value;
        continue;
      }

      const columnType =
        columnTypes.get(column) ?? "unknown";

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
        continue;
      }

      /*
       * Default unknown rotation data to encounters.
       * This is safer than losing valid Pokémon data.
       */
      encounters.push(value);
    }
  }

  /*
   * Secondary crystal search.
   *
   * Search around the ACTIVE / Current rows only,
   * never across the entire spreadsheet.
   */
  if (!crystal) {
    const activeAreaStart = Math.max(
      0,
      headerRowIndex - 5,
    );

    const activeArea = raw.slice(
      activeAreaStart,
      headerRowIndex,
    );

    for (const row of activeArea) {
      for (let i = 0; i < row.length; i++) {
        const cell = normalize(row[i]).toLowerCase();

        if (cell === "crystal") {
          const nextValue = normalize(row[i + 1]);

          if (isDataValue(nextValue)) {
            crystal = nextValue;
            break;
          }
        }
      }

      if (crystal) {
        break;
      }
    }
  }

  const finalEncounters = unique(encounters);
  const finalHordes = unique(hordes);

  console.log("ALTERING CAVE PARSED:", {
    headerRowIndex,
    rotationColumns,
    crystal,
    encounters: finalEncounters,
    hordes: finalHordes,
  });

  return {
    crystal,
    encounters: finalEncounters,
    hordes: finalHordes,
    raw,
  };
}