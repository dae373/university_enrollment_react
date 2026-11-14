import * as XLSX from "xlsx";
import type {
  DatasetType,
  EnrollmentRow,
  GroupSummary,
  HighSchoolOriginRow,
  ParsedFile,
  SummaryMetrics,
  ValidationIssue,
} from "./types";

type SheetRow = unknown[];

const text = (value: unknown): string =>
  value === null || value === undefined
    ? ""
    : String(value).replace(/\s+/g, " ").trim();

const numberValue = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractYear = (value: string): number | null => {
  const match = value.match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
};

const rowText = (row: SheetRow): string => row.map(text).join(" | ");

function findHeaderRow(rows: SheetRow[], required: string[], maxRows = 20): number {
  const limit = Math.min(maxRows, rows.length);
  for (let index = 0; index < limit; index += 1) {
    const combined = rowText(rows[index] ?? []);
    if (required.every((keyword) => combined.includes(keyword))) return index;
  }
  return -1;
}

export function detectDataset(rows: SheetRow[]): {
  datasetType: DatasetType;
  title: string;
  year: number | null;
} {
  const sample = rows
    .slice(0, 12)
    .flatMap((row) => row.slice(0, 60))
    .map(text)
    .join(" ");
  const title = text(rows[0]?.[0]);
  const year = extractYear(sample);

  if (sample.includes("신입생 충원 현황")) {
    return { datasetType: "충원 현황", title, year };
  }
  if (
    sample.includes("출신 고등학교 유형별 현황") ||
    sample.includes("출신학교 유형별")
  ) {
    return { datasetType: "출신 고교 현황", title, year };
  }
  return { datasetType: "알 수 없음", title, year };
}

function parseEnrollment(
  rows: SheetRow[],
  filename: string,
): { data: EnrollmentRow[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const headerRow = findHeaderRow(rows, ["기준연도", "학교", "입학정원"]);

  if (headerRow < 0) {
    throw new Error("충원 현황 헤더 행을 찾을 수 없습니다.");
  }

  const dataStart = headerRow + 3;
  const data: EnrollmentRow[] = [];

  rows.slice(dataStart).forEach((row) => {
    if (!text(row[0])) return;

    const recruitIn = numberValue(row[8]);
    const applicantIn = numberValue(row[11]);
    const entrantInMale = numberValue(row[14]);
    const entrantInFemale = numberValue(row[15]);
    const entrantOutMale = numberValue(row[16]);
    const entrantOutFemale = numberValue(row[17]);
    const entrantIn = entrantInMale + entrantInFemale;
    const entrantOut = entrantOutMale + entrantOutFemale;

    data.push({
      year: numberValue(row[0]),
      schoolType: text(row[1]),
      ownership: text(row[2]),
      region: text(row[3]),
      status: text(row[4]),
      school: text(row[5]),
      admissionQuota: numberValue(row[6]),
      recruitTotal: numberValue(row[7]),
      recruitIn,
      recruitOut: numberValue(row[9]),
      applicantTotal: numberValue(row[10]),
      applicantIn,
      applicantOut: numberValue(row[12]),
      entrantTotal: numberValue(row[13]),
      entrantInMale,
      entrantInFemale,
      entrantOutMale,
      entrantOutFemale,
      fillRate: numberValue(row[18]),
      competitionRate: numberValue(row[19]),
      entrantIn,
      entrantOut,
      calculatedFillRate: recruitIn > 0 ? (entrantIn / recruitIn) * 100 : null,
      calculatedCompetitionRate:
        recruitIn > 0 ? applicantIn / recruitIn : null,
      unfilled: recruitIn - entrantIn,
      sourceFile: filename,
    });
  });

  const zeroRecruit = data.filter((row) => row.recruitIn === 0).length;
  if (zeroRecruit > 0) {
    issues.push({
      severity: "정보",
      category: "모집인원",
      message: `정원 내 모집인원이 0인 기관 ${zeroRecruit}개는 충원율 순위에서 기본 제외됩니다.`,
    });
  }

  const over100 = data.filter((row) => row.fillRate > 100).length;
  if (over100 > 0) {
    issues.push({
      severity: "주의",
      category: "충원율",
      message: `충원율 100% 초과 기관이 ${over100}개 있습니다. 원자료와 산식을 확인하세요.`,
    });
  }

  const duplicated = new Map<string, number>();
  data.forEach((row) => {
    const key = `${row.year}::${row.school}`;
    duplicated.set(key, (duplicated.get(key) ?? 0) + 1);
  });
  const duplicateCount = [...duplicated.values()].filter((count) => count > 1).length;
  if (duplicateCount > 0) {
    issues.push({
      severity: "주의",
      category: "중복",
      message: `동일 연도·학교 중복 키가 ${duplicateCount}개 있습니다.`,
    });
  }

  const rateMismatch = data.filter(
    (row) =>
      row.calculatedFillRate !== null &&
      Math.abs(row.fillRate - row.calculatedFillRate) > 0.15,
  ).length;
  if (rateMismatch > 0) {
    issues.push({
      severity: "주의",
      category: "산식 검증",
      message: `원자료 충원율과 재계산 값의 차이가 0.15%p를 넘는 행이 ${rateMismatch}개 있습니다.`,
    });
  }

  return { data, issues };
}

function parseOrigin(
  rows: SheetRow[],
  filename: string,
): { data: HighSchoolOriginRow[]; issues: ValidationIssue[] } {
  const headerRow = findHeaderRow(rows, ["기준연도", "학교", "총입학자수"]);
  if (headerRow < 0) {
    throw new Error("출신 고교 현황 헤더 행을 찾을 수 없습니다.");
  }

  const dataStart = headerRow + 6;
  const data: HighSchoolOriginRow[] = [];

  rows.slice(dataStart).forEach((row) => {
    if (!text(row[0])) return;
    data.push({
      year: numberValue(row[0]),
      schoolType: text(row[1]),
      ownership: text(row[2]),
      region: text(row[3]),
      status: text(row[4]),
      school: text(row[5]),
      totalEntrants: numberValue(row[6]),
      sourceFile: filename,
    });
  });

  return {
    data,
    issues: [
      {
        severity: "정보",
        category: "공시 항목",
        message:
          "이 파일은 충원 현황이 아니라 출신 고교 현황입니다. 충원율 전년 비교에는 사용할 수 없습니다.",
      },
    ],
  };
}

export async function parseExcelFile(
  buffer: ArrayBuffer,
  filename: string,
): Promise<ParsedFile> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const detected = detectDataset(rows);
  const base: ParsedFile = {
    filename,
    datasetType: detected.datasetType,
    year: detected.year,
    title: detected.title,
    enrollmentRows: [],
    originRows: [],
    issues: [],
    rowCount: 0,
  };

  try {
    if (detected.datasetType === "충원 현황") {
      const parsed = parseEnrollment(rows, filename);
      return {
        ...base,
        enrollmentRows: parsed.data,
        issues: parsed.issues,
        rowCount: parsed.data.length,
      };
    }

    if (detected.datasetType === "출신 고교 현황") {
      const parsed = parseOrigin(rows, filename);
      return {
        ...base,
        originRows: parsed.data,
        issues: parsed.issues,
        rowCount: parsed.data.length,
      };
    }

    return {
      ...base,
      issues: [
        {
          severity: "오류",
          category: "파일 판별",
          message: "지원하지 않는 공시 항목입니다. 원본 파일을 확인하세요.",
        },
      ],
    };
  } catch (error) {
    return {
      ...base,
      issues: [
        {
          severity: "오류",
          category: "파싱",
          message: error instanceof Error ? error.message : "알 수 없는 오류",
        },
      ],
    };
  }
}

export function calculateSummary(rows: EnrollmentRow[]): SummaryMetrics {
  const recruitIn = rows.reduce((sum, row) => sum + row.recruitIn, 0);
  const applicantIn = rows.reduce((sum, row) => sum + row.applicantIn, 0);
  const entrantIn = rows.reduce((sum, row) => sum + row.entrantIn, 0);

  return {
    institutionCount: rows.length,
    recruitIn,
    applicantIn,
    entrantIn,
    fillRate: recruitIn > 0 ? (entrantIn / recruitIn) * 100 : 0,
    competitionRate: recruitIn > 0 ? applicantIn / recruitIn : 0,
  };
}

export function aggregateBy(
  rows: EnrollmentRow[],
  key: "region" | "ownership" | "schoolType",
): GroupSummary[] {
  const groups = new Map<string, EnrollmentRow[]>();
  rows.forEach((row) => {
    const group = row[key] || "미분류";
    groups.set(group, [...(groups.get(group) ?? []), row]);
  });

  return [...groups.entries()]
    .map(([group, groupRows]) => ({
      group,
      ...calculateSummary(groupRows),
      below95: groupRows.filter((row) => row.fillRate < 95).length,
    }))
    .sort((a, b) => a.fillRate - b.fillRate);
}

export const uniqueSorted = (values: string[]): string[] =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );

export const formatNumber = (value: number, digits = 0): string =>
  new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
