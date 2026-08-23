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

const normalizedRow = (row: string[]): string[] =>
  row.map(normalize);

const rowText = (row: string[]): string =>
  normalizedRow(row).join(" ").toLowerCase();

const unique = (items: string[]): string[] =>
  [...new Set(items.map(normalize).filter(Boolean))];

const isPokemonLike = (value: string): boolean => {
  const text = normalize(value);

  if (!text) return false;

  const blocked = [
    "encounter",
    "encounters",
    "horde",
    "hordes",
    "crystal",
    "altering cave",
    "rotation",
    "rotations",
    "pokemon",
    "pokémon",
    "current",
    "date",
    "time",
    "notes",
    "location",
  ];

  return !blocked.includes(text.toLowerCase());
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

  const raw = parsed.data
    .map(normalizedRow)
    .filter((row) => row.some(Boolean));

  if (raw.length === 0) {
    throw new Error(
      "The Altering Cave spreadsheet contains no data",
    );
  }

  /*
   * Find the actual Altering Cave section.
   * The sheet begins with credits and metadata,
   * so we do not assume row 0 contains the headers.
   */
  let sectionStart = raw.findIndex((row) =>
    rowText(row).includes("altering cave"),
  );

  if (sectionStart === -1) {
    sectionStart = 0;
  }

  /*
   * Find another Altering Cave heading if one exists.
   * Otherwise use the remainder of the sheet.
   */
  let sectionEnd = raw.length;

  for (let i = sectionStart + 1; i < raw.length; i++) {
    if (rowText(raw[i]).includes("altering cave")) {
      sectionEnd = i;
      break;
    }
  }

  const section = raw.slice(sectionStart, sectionEnd);

  let crystal = "";
  const encounters: string[] = [];
  const hordes: string[] = [];

  /*
   * Search the section for labels and nearby values.
   */
  for (let i = 0; i < section.length; i++) {
    const row = normalizedRow(section[i]);

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      const lower = cell.toLowerCase();

      /*
       * Crystal
       */
      if (
        !crystal &&
        (
          lower === "crystal" ||
          lower.includes("current crystal")
        )
      ) {
        const possibleCrystal =
          row[j + 1] ||
          row.find(
            (value, index) =>
              index !== j &&
              value &&
              !value.toLowerCase().includes("crystal"),
          ) ||
          "";

        if (possibleCrystal) {
          crystal = possibleCrystal;
        }
      }

      /*
       * Encounters
       */
      if (
        lower === "encounter" ||
        lower === "encounters"
      ) {
        encounters.push(
          ...row
            .slice(j + 1)
            .filter(isPokemonLike),
        );

        for (
          let nextRow = i + 1;
          nextRow < Math.min(i + 15, section.length);
          nextRow++
        ) {
          const next = normalizedRow(section[nextRow]);
          const nextText = next.join(" ").toLowerCase();

          if (
            nextText.includes("horde") ||
            nextText.includes("crystal") ||
            nextText.includes("rotation")
          ) {
            break;
          }

          encounters.push(
            ...next.filter(isPokemonLike),
          );
        }
      }

      /*
       * Hordes
       */
      if (
        lower === "horde" ||
        lower === "hordes"
      ) {
        hordes.push(
          ...row
            .slice(j + 1)
            .filter(isPokemonLike),
        );

        for (
          let nextRow = i + 1;
          nextRow < Math.min(i + 15, section.length);
          nextRow++
        ) {
          const next = normalizedRow(section[nextRow]);
          const nextText = next.join(" ").toLowerCase();

          if (
            nextText.includes("encounter") ||
            nextText.includes("crystal") ||
            nextText.includes("rotation")
          ) {
            break;
          }

          hordes.push(
            ...next.filter(isPokemonLike),
          );
        }
      }
    }
  }

  /*
   * Secondary parser:
   * Look for table headers containing Crystal,
   * Encounter, or Horde.
   */
  for (let i = 0; i < section.length; i++) {
    const headers = normalizedRow(section[i]);

    const lowerHeaders = headers.map((header) =>
      header.toLowerCase(),
    );

    const crystalColumn = lowerHeaders.findIndex((header) =>
      header.includes("crystal"),
    );

    const encounterColumn = lowerHeaders.findIndex(
      (header) =>
        header.includes("encounter") &&
        !header.includes("horde"),
    );

    const hordeColumn = lowerHeaders.findIndex((header) =>
      header.includes("horde"),
    );

    if (
      crystalColumn === -1 &&
      encounterColumn === -1 &&
      hordeColumn === -1
    ) {
      continue;
    }

    for (
      let dataRow = i + 1;
      dataRow < Math.min(i + 25, section.length);
      dataRow++
    ) {
      const row = normalizedRow(section[dataRow]);

      if (row.every((cell) => !cell)) {
        break;
      }

      if (
        !crystal &&
        crystalColumn !== -1 &&
        row[crystalColumn] &&
        isPokemonLike(row[crystalColumn])
      ) {
        crystal = row[crystalColumn];
      }

      if (
        encounterColumn !== -1 &&
        row[encounterColumn] &&
        isPokemonLike(row[encounterColumn])
      ) {
        encounters.push(
          row[encounterColumn],
        );
      }

      if (
        hordeColumn !== -1 &&
        row[hordeColumn] &&
        isPokemonLike(row[hordeColumn])
      ) {
        hordes.push(
          row[hordeColumn],
        );
      }
    }
  }

  const finalEncounters = unique(encounters);
  const finalHordes = unique(hordes);

  console.log(
    "ALTERING CAVE SECTION:",
    section,
  );

  console.log(
    "ALTERING CAVE PARSED:",
    {
      crystal,
      encounters: finalEncounters,
      hordes: finalHordes,
    },
  );

  return {
    crystal,
    encounters: finalEncounters,
    hordes: finalHordes,
    raw,
  };
}