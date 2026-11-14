export type DatasetType = "충원 현황" | "출신 고교 현황" | "알 수 없음";
export type Severity = "오류" | "주의" | "정보";

export interface ValidationIssue {
  severity: Severity;
  category: string;
  message: string;
}

export interface EnrollmentRow {
  year: number;
  schoolType: string;
  ownership: string;
  region: string;
  status: string;
  school: string;
  admissionQuota: number;
  recruitTotal: number;
  recruitIn: number;
  recruitOut: number;
  applicantTotal: number;
  applicantIn: number;
  applicantOut: number;
  entrantTotal: number;
  entrantInMale: number;
  entrantInFemale: number;
  entrantOutMale: number;
  entrantOutFemale: number;
  fillRate: number;
  competitionRate: number;
  entrantIn: number;
  entrantOut: number;
  calculatedFillRate: number | null;
  calculatedCompetitionRate: number | null;
  unfilled: number;
  sourceFile: string;
}

export interface HighSchoolOriginRow {
  year: number;
  schoolType: string;
  ownership: string;
  region: string;
  status: string;
  school: string;
  totalEntrants: number;
  sourceFile: string;
}

export interface ParsedFile {
  filename: string;
  datasetType: DatasetType;
  year: number | null;
  title: string;
  enrollmentRows: EnrollmentRow[];
  originRows: HighSchoolOriginRow[];
  issues: ValidationIssue[];
  rowCount: number;
}

export interface SummaryMetrics {
  institutionCount: number;
  recruitIn: number;
  applicantIn: number;
  entrantIn: number;
  fillRate: number;
  competitionRate: number;
}

export interface GroupSummary extends SummaryMetrics {
  group: string;
  below95: number;
}
