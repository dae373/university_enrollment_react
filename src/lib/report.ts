import { saveAs } from "file-saver";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import * as XLSX from "xlsx";
import { aggregateBy, calculateSummary } from "./data";
import type { EnrollmentRow, ParsedFile } from "./types";

export interface ReportFilters {
  year: number;
  schoolTypes: string[];
  regions: string[];
  ownerships: string[];
  excludeZero: boolean;
}

const cell = (value: string, bold = false) =>
  new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: value, bold })] })],
  });

export async function downloadWordReport(
  rows: EnrollmentRow[],
  filters: ReportFilters,
): Promise<void> {
  const summary = calculateSummary(rows);
  const low = [...rows]
    .filter((row) => row.recruitIn > 0)
    .sort((a, b) => a.fillRate - b.fillRate)
    .slice(0, 15);

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "대학 신입생 충원 현황 분석 보고서",
                bold: true,
                size: 38,
                color: "1F4E79",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `분석연도 ${filters.year}년 | 기관 ${summary.institutionCount}개`,
                color: "667085",
              }),
            ],
          }),
          new Paragraph({
            text: "1. 분석 조건",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph(
            `학교종류: ${filters.schoolTypes.join(", ")} | 지역: ${filters.regions.join(", ")} | 설립구분: ${filters.ownerships.join(", ")}`,
          ),
          new Paragraph({
            text: "2. 핵심 지표",
            heading: HeadingLevel.HEADING_1,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell("기관 수", true),
                  cell("모집인원", true),
                  cell("지원자", true),
                  cell("입학자", true),
                  cell("충원율", true),
                  cell("경쟁률", true),
                ],
              }),
              new TableRow({
                children: [
                  cell(`${summary.institutionCount}개`),
                  cell(`${summary.recruitIn.toLocaleString()}명`),
                  cell(`${summary.applicantIn.toLocaleString()}명`),
                  cell(`${summary.entrantIn.toLocaleString()}명`),
                  cell(`${summary.fillRate.toFixed(2)}%`),
                  cell(`${summary.competitionRate.toFixed(2)}대 1`),
                ],
              }),
            ],
          }),
          new Paragraph({
            text: "3. 분석 요약",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph(
            `가중 충원율은 ${summary.fillRate.toFixed(2)}%, 가중 경쟁률은 ${summary.competitionRate.toFixed(2)}대 1입니다. 충원율 95% 미만 기관은 ${rows.filter((row) => row.fillRate < 95).length}개입니다.`,
          ),
          new Paragraph({
            text: "4. 충원율 하위 기관",
            heading: HeadingLevel.HEADING_1,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell("학교", true),
                  cell("지역", true),
                  cell("모집인원", true),
                  cell("입학자", true),
                  cell("충원율", true),
                  cell("경쟁률", true),
                ],
              }),
              ...low.map(
                (row) =>
                  new TableRow({
                    children: [
                      cell(row.school),
                      cell(row.region),
                      cell(row.recruitIn.toLocaleString()),
                      cell(row.entrantIn.toLocaleString()),
                      cell(`${row.fillRate.toFixed(1)}%`),
                      cell(`${row.competitionRate.toFixed(1)}대 1`),
                    ],
                  }),
              ),
            ],
          }),
          new Paragraph({
            text: "5. 해석상 유의사항",
            heading: HeadingLevel.HEADING_1,
          }),
          ...[
            "본 결과는 대학의 교육 품질 순위가 아니라 모집 및 등록 현황 분석입니다.",
            "종교계·예술계·특수목적 대학은 모집 구조가 다를 수 있습니다.",
            "모집인원 0인 기관은 충원율 순위에서 제외하는 것이 적절합니다.",
            "전년 비교는 동일한 공시 항목과 학교·캠퍼스 기준이 확보된 경우에만 수행해야 합니다.",
          ].map(
            (message) =>
              new Paragraph({
                text: message,
                bullet: { level: 0 },
              }),
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, `enrollment_report_${filters.year}.docx`);
}

export function downloadExcelReport(
  rows: EnrollmentRow[],
  parsedFiles: ParsedFile[],
  filters: ReportFilters,
): void {
  const workbook = XLSX.utils.book_new();
  const summary = calculateSummary(rows);

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["항목", "값"],
    ["기관 수", summary.institutionCount],
    ["정원 내 모집인원", summary.recruitIn],
    ["정원 내 지원자", summary.applicantIn],
    ["정원 내 입학자", summary.entrantIn],
    ["가중 충원율", Number(summary.fillRate.toFixed(2))],
    ["가중 경쟁률", Number(summary.competitionRate.toFixed(2))],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "요약");

  const detailSheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      학교: row.school,
      학교종류: row.schoolType,
      설립구분: row.ownership,
      지역: row.region,
      입학정원: row.admissionQuota,
      정원내모집인원: row.recruitIn,
      정원내지원자: row.applicantIn,
      정원내입학자: row.entrantIn,
      충원율: row.fillRate,
      경쟁률: row.competitionRate,
      미충원인원: row.unfilled,
    })),
  );
  XLSX.utils.book_append_sheet(workbook, detailSheet, "정제데이터");

  const regionSheet = XLSX.utils.json_to_sheet(
    aggregateBy(rows, "region").map((row) => ({
      지역: row.group,
      기관수: row.institutionCount,
      모집인원: row.recruitIn,
      지원자: row.applicantIn,
      입학자: row.entrantIn,
      충원율: Number(row.fillRate.toFixed(2)),
      경쟁률: Number(row.competitionRate.toFixed(2)),
      충원율95미만: row.below95,
    })),
  );
  XLSX.utils.book_append_sheet(workbook, regionSheet, "지역분석");

  const validationRows = parsedFiles.flatMap((file) =>
    file.issues.map((issue) => ({
      파일: file.filename,
      공시항목: file.datasetType,
      심각도: issue.severity,
      항목: issue.category,
      내용: issue.message,
    })),
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(validationRows),
    "검증로그",
  );

  XLSX.writeFile(workbook, `enrollment_analysis_${filters.year}.xlsx`);
}
