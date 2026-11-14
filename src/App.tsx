import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { EmptyState, MetricCard } from "./components/Ui";
import {
  aggregateBy,
  calculateSummary,
  formatNumber,
  parseExcelFile,
  uniqueSorted,
} from "./lib/data";
import { downloadExcelReport, downloadWordReport } from "./lib/report";
import type {
  EnrollmentRow,
  ParsedFile,
  Severity,
} from "./lib/types";

type Tab =
  | "dashboard"
  | "groups"
  | "comparison"
  | "yearly"
  | "validation"
  | "reports";

const sampleFiles = [
  { name: "2025_data.xlsx", url: "/sample_data/2025_data.xlsx" },
  { name: "2026_data.xlsx", url: "/sample_data/2026_data.xlsx" },
];

const tabItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "종합 대시보드", icon: LayoutDashboard },
  { id: "groups", label: "지역·설립 분석", icon: BarChart3 },
  { id: "comparison", label: "대학 비교", icon: Building2 },
  { id: "yearly", label: "전년 비교", icon: TrendingUp },
  { id: "validation", label: "데이터 검증", icon: ShieldCheck },
  { id: "reports", label: "보고서", icon: FileText },
];

const severityIcon = (severity: Severity) => {
  if (severity === "오류") return <XCircle size={16} />;
  if (severity === "주의") return <AlertTriangle size={16} />;
  return <CheckCircle2 size={16} />;
};

const chartColors = [
  "#176B87",
  "#64CCC5",
  "#1F4E79",
  "#F4A261",
  "#7C3AED",
  "#E76F51",
  "#2A9D8F",
  "#64748B",
];

function App() {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["대학교"]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedOwnerships, setSelectedOwnerships] = useState<string[]>([]);
  const [excludeZero, setExcludeZero] = useState(true);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [riskThreshold, setRiskThreshold] = useState(95);
  const [compareSchools, setCompareSchools] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const enrollmentRows = useMemo(
    () => parsedFiles.flatMap((file) => file.enrollmentRows),
    [parsedFiles],
  );
  const originRows = useMemo(
    () => parsedFiles.flatMap((file) => file.originRows),
    [parsedFiles],
  );

  const years = useMemo(
    () =>
      [...new Set(enrollmentRows.map((row) => row.year))].sort(
        (a, b) => a - b,
      ),
    [enrollmentRows],
  );

  const yearRows = useMemo(
    () => enrollmentRows.filter((row) => row.year === selectedYear),
    [enrollmentRows, selectedYear],
  );

  const options = useMemo(
    () => ({
      types: uniqueSorted(yearRows.map((row) => row.schoolType)),
      regions: uniqueSorted(yearRows.map((row) => row.region)),
      ownerships: uniqueSorted(yearRows.map((row) => row.ownership)),
    }),
    [yearRows],
  );

  useEffect(() => {
    loadSamples();
  }, []);

  useEffect(() => {
    if (years.length && !years.includes(selectedYear)) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  useEffect(() => {
    if (!selectedRegions.length && options.regions.length) {
      setSelectedRegions(options.regions);
    }
    if (!selectedOwnerships.length && options.ownerships.length) {
      setSelectedOwnerships(options.ownerships);
    }
    if (
      options.types.length &&
      !selectedTypes.some((value) => options.types.includes(value))
    ) {
      setSelectedTypes(
        options.types.includes("대학교") ? ["대학교"] : options.types,
      );
    }
  }, [options]);

  const filteredRows = useMemo(() => {
    const query = schoolQuery.trim().toLocaleLowerCase("ko");
    return yearRows.filter((row) => {
      const typeMatch = selectedTypes.includes(row.schoolType);
      const regionMatch = selectedRegions.includes(row.region);
      const ownershipMatch = selectedOwnerships.includes(row.ownership);
      const zeroMatch = !excludeZero || row.recruitIn > 0;
      const queryMatch =
        !query || row.school.toLocaleLowerCase("ko").includes(query);
      return (
        typeMatch &&
        regionMatch &&
        ownershipMatch &&
        zeroMatch &&
        queryMatch
      );
    });
  }, [
    yearRows,
    selectedTypes,
    selectedRegions,
    selectedOwnerships,
    excludeZero,
    schoolQuery,
  ]);

  const summary = useMemo(
    () => calculateSummary(filteredRows),
    [filteredRows],
  );
  const regionSummary = useMemo(
    () => aggregateBy(filteredRows, "region"),
    [filteredRows],
  );
  const ownershipSummary = useMemo(
    () => aggregateBy(filteredRows, "ownership"),
    [filteredRows],
  );
  const riskRows = useMemo(
    () =>
      [...filteredRows]
        .filter((row) => row.fillRate < riskThreshold)
        .sort((a, b) => a.fillRate - b.fillRate),
    [filteredRows, riskThreshold],
  );

  async function loadSamples() {
    setLoading(true);
    try {
      const parsed = await Promise.all(
        sampleFiles.map(async (sample) => {
          const response = await fetch(sample.url);
          if (!response.ok) throw new Error(`${sample.name} 로드 실패`);
          return parseExcelFile(await response.arrayBuffer(), sample.name);
        }),
      );
      setParsedFiles(parsed);
    } catch (error) {
      console.error(error);
      setParsedFiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;

    setLoading(true);
    try {
      const parsed = await Promise.all(
        files.map(async (file) =>
          parseExcelFile(await file.arrayBuffer(), file.name),
        ),
      );
      setParsedFiles(parsed);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function toggleMulti(
    value: string,
    selected: string[],
    setter: (next: string[]) => void,
  ) {
    setter(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  const reportFilters = {
    year: selectedYear,
    schoolTypes: selectedTypes,
    regions: selectedRegions,
    ownerships: selectedOwnerships,
    excludeZero,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__mark">
            <GraduationCap size={25} />
          </div>
          <div>
            <strong>UniFill Insight</strong>
            <span>대학 충원 분석 플랫폼</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={activeTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section__title">데이터</div>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls"
            multiple
            hidden
            onChange={handleUpload}
          />
          <button
            className="upload-button"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={17} />
            Excel 업로드
          </button>
          <button className="ghost-button" onClick={loadSamples}>
            <RefreshCw size={15} />
            샘플 데이터 복원
          </button>
        </div>

        <div className="sidebar-section filters">
          <div className="sidebar-section__title">분석 조건</div>
          <label>
            분석연도
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {years.map((year) => (
                <option value={year} key={year}>
                  {year}년
                </option>
              ))}
            </select>
          </label>

          <FilterChips
            title="학교종류"
            options={options.types}
            selected={selectedTypes}
            onToggle={(value) =>
              toggleMulti(value, selectedTypes, setSelectedTypes)
            }
          />
          <FilterChips
            title="지역"
            options={options.regions}
            selected={selectedRegions}
            onToggle={(value) =>
              toggleMulti(value, selectedRegions, setSelectedRegions)
            }
            compact
          />
          <FilterChips
            title="설립구분"
            options={options.ownerships}
            selected={selectedOwnerships}
            onToggle={(value) =>
              toggleMulti(value, selectedOwnerships, setSelectedOwnerships)
            }
            compact
          />

          <label className="check-row">
            <input
              type="checkbox"
              checked={excludeZero}
              onChange={(event) => setExcludeZero(event.target.checked)}
            />
            모집인원 0 기관 제외
          </label>
        </div>

        <div className="sidebar-footer">
          데이터는 브라우저에서 처리되며 서버로 전송되지 않습니다.
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">대학알리미 데이터 기반</span>
            <h1>{tabItems.find((item) => item.id === activeTab)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input
                placeholder="대학명 검색"
                value={schoolQuery}
                onChange={(event) => setSchoolQuery(event.target.value)}
              />
            </div>
            <div className="data-badge">
              <FileSpreadsheet size={16} />
              파일 {parsedFiles.length}개
            </div>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">
            <Loader2 className="spin" size={32} />
            <p>데이터를 분석하고 있습니다.</p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <Dashboard
                rows={filteredRows}
                summary={summary}
                riskRows={riskRows}
                riskThreshold={riskThreshold}
                setRiskThreshold={setRiskThreshold}
              />
            )}
            {activeTab === "groups" && (
              <GroupAnalysis
                regionSummary={regionSummary}
                ownershipSummary={ownershipSummary}
              />
            )}
            {activeTab === "comparison" && (
              <UniversityComparison
                rows={filteredRows}
                selected={compareSchools}
                setSelected={setCompareSchools}
              />
            )}
            {activeTab === "yearly" && (
              <YearlyComparison rows={enrollmentRows} years={years} />
            )}
            {activeTab === "validation" && (
              <Validation parsedFiles={parsedFiles} />
            )}
            {activeTab === "reports" && (
              <Reports
                rows={filteredRows}
                files={parsedFiles}
                filters={reportFilters}
                originCount={originRows.length}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FilterChips({
  title,
  options,
  selected,
  onToggle,
  compact = false,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="filter-group">
      <span>{title}</span>
      <div className={`chip-list ${compact ? "chip-list--compact" : ""}`}>
        {options.map((option) => (
          <button
            key={option}
            className={selected.includes(option) ? "selected" : ""}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dashboard({
  rows,
  summary,
  riskRows,
  riskThreshold,
  setRiskThreshold,
}: {
  rows: EnrollmentRow[];
  summary: ReturnType<typeof calculateSummary>;
  riskRows: EnrollmentRow[];
  riskThreshold: number;
  setRiskThreshold: (value: number) => void;
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title="분석할 데이터가 없습니다."
        description="왼쪽 필터를 조정하거나 새로운 Excel 파일을 업로드하세요."
      />
    );
  }

  const scatterData = rows.map((row) => ({
    ...row,
    size: Math.max(30, Math.sqrt(row.recruitIn) * 5),
  }));

  return (
    <div className="page-stack">
      <section className="metric-grid">
        <MetricCard
          label="분석 기관"
          value={`${formatNumber(summary.institutionCount)}개`}
          icon={<Building2 size={19} />}
        />
        <MetricCard
          label="정원 내 모집인원"
          value={`${formatNumber(summary.recruitIn)}명`}
          icon={<Users size={19} />}
          tone="green"
        />
        <MetricCard
          label="정원 내 지원자"
          value={`${formatNumber(summary.applicantIn)}명`}
          icon={<FileText size={19} />}
        />
        <MetricCard
          label="가중 충원율"
          value={`${formatNumber(summary.fillRate, 2)}%`}
          note={`95% 미만 ${rows.filter((row) => row.fillRate < 95).length}개`}
          icon={<TrendingUp size={19} />}
          tone={summary.fillRate < 95 ? "red" : "green"}
        />
        <MetricCard
          label="가중 경쟁률"
          value={`${formatNumber(summary.competitionRate, 2)}대 1`}
          icon={<BarChart3 size={19} />}
          tone="orange"
        />
      </section>

      <section className="two-column">
        <article className="panel panel--wide">
          <PanelHeader
            title="경쟁률과 충원율"
            description="원의 크기는 정원 내 모집인원을 의미합니다."
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={430}>
              <ScatterChart margin={{ top: 15, right: 24, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  dataKey="competitionRate"
                  name="경쟁률"
                  unit="대 1"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="fillRate"
                  name="충원율"
                  unit="%"
                  domain={[0, "auto"]}
                  tick={{ fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="size" range={[45, 420]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={<ScatterTooltip />}
                />
                <ReferenceLine y={95} stroke="#E76F51" strokeDasharray="5 5" />
                <ReferenceLine y={100} stroke="#94A3B8" strokeDasharray="3 3" />
                <Scatter data={scatterData} fill="#176B87">
                  {scatterData.map((row, index) => (
                    <Cell
                      key={`${row.school}-${index}`}
                      fill={
                        row.fillRate < 95
                          ? "#E76F51"
                          : chartColors[index % chartColors.length]
                      }
                      fillOpacity={0.76}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <PanelHeader
            title="충원 위험 기관"
            description={`충원율 ${riskThreshold}% 미만`}
          />
          <div className="range-row">
            <input
              type="range"
              min={50}
              max={100}
              value={riskThreshold}
              onChange={(event) =>
                setRiskThreshold(Number(event.target.value))
              }
            />
            <strong>{riskThreshold}%</strong>
          </div>
          <div className="risk-list">
            {riskRows.slice(0, 12).map((row, index) => (
              <div className="risk-item" key={`${row.school}-${index}`}>
                <div>
                  <strong>{row.school}</strong>
                  <span>
                    {row.region} · 모집 {formatNumber(row.recruitIn)}명
                  </span>
                </div>
                <div className="risk-item__rate">{row.fillRate.toFixed(1)}%</div>
              </div>
            ))}
            {!riskRows.length && (
              <div className="success-message">
                <CheckCircle2 size={22} />
                기준 미만 기관이 없습니다.
              </div>
            )}
          </div>
        </article>
      </section>

      <article className="panel">
        <PanelHeader
          title="대학별 상세 데이터"
          description="충원율이 낮은 순서로 표시합니다."
        />
        <DataTable rows={[...rows].sort((a, b) => a.fillRate - b.fillRate)} />
      </article>
    </div>
  );
}

function GroupAnalysis({
  regionSummary,
  ownershipSummary,
}: {
  regionSummary: ReturnType<typeof aggregateBy>;
  ownershipSummary: ReturnType<typeof aggregateBy>;
}) {
  return (
    <div className="page-stack">
      <section className="two-column equal">
        <article className="panel">
          <PanelHeader
            title="지역별 가중 충원율"
            description="입학자 합계 ÷ 모집인원 합계"
          />
          <ResponsiveContainer width="100%" height={520}>
            <BarChart
              data={regionSummary}
              layout="vertical"
              margin={{ left: 10, right: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[80, "auto"]} />
              <YAxis
                type="category"
                dataKey="group"
                width={70}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <ReferenceLine x={100} stroke="#94A3B8" strokeDasharray="4 4" />
              <Bar dataKey="fillRate" radius={[0, 6, 6, 0]}>
                {regionSummary.map((row, index) => (
                  <Cell
                    key={row.group}
                    fill={
                      row.fillRate < 95
                        ? "#E76F51"
                        : chartColors[index % chartColors.length]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <PanelHeader
            title="지역별 가중 경쟁률"
            description="지원자 합계 ÷ 모집인원 합계"
          />
          <ResponsiveContainer width="100%" height={520}>
            <BarChart
              data={[...regionSummary].sort(
                (a, b) => a.competitionRate - b.competitionRate,
              )}
              layout="vertical"
              margin={{ left: 10, right: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="group"
                width={70}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(2)}대 1`}
              />
              <Bar
                dataKey="competitionRate"
                fill="#2A9D8F"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <article className="panel">
        <PanelHeader
          title="설립 유형별 요약"
          description="설립 구분에 따른 모집 성과 비교"
        />
        <div className="summary-cards">
          {ownershipSummary.map((row) => (
            <div className="summary-card" key={row.group}>
              <span>{row.group}</span>
              <strong>{row.fillRate.toFixed(2)}%</strong>
              <div>
                경쟁률 {row.competitionRate.toFixed(2)}대 1 · 기관{" "}
                {row.institutionCount}개
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="지역별 상세표" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>지역</th>
                <th>기관 수</th>
                <th>모집인원</th>
                <th>지원자</th>
                <th>입학자</th>
                <th>충원율</th>
                <th>경쟁률</th>
                <th>95% 미만</th>
              </tr>
            </thead>
            <tbody>
              {regionSummary.map((row) => (
                <tr key={row.group}>
                  <td className="school-cell">{row.group}</td>
                  <td>{row.institutionCount}</td>
                  <td>{formatNumber(row.recruitIn)}</td>
                  <td>{formatNumber(row.applicantIn)}</td>
                  <td>{formatNumber(row.entrantIn)}</td>
                  <td>{row.fillRate.toFixed(2)}%</td>
                  <td>{row.competitionRate.toFixed(2)}대 1</td>
                  <td>{row.below95}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function UniversityComparison({
  rows,
  selected,
  setSelected,
}: {
  rows: EnrollmentRow[];
  selected: string[];
  setSelected: (value: string[]) => void;
}) {
  const schools = uniqueSorted(rows.map((row) => row.school));
  const comparisonRows = rows.filter((row) => selected.includes(row.school));

  function toggle(school: string) {
    if (selected.includes(school)) {
      setSelected(selected.filter((item) => item !== school));
    } else if (selected.length < 10) {
      setSelected([...selected, school]);
    }
  }

  return (
    <div className="page-stack">
      <article className="panel">
        <PanelHeader
          title="비교 대학 선택"
          description="최대 10개 대학·캠퍼스를 선택할 수 있습니다."
        />
        <div className="school-picker">
          {schools.map((school) => (
            <button
              key={school}
              className={selected.includes(school) ? "selected" : ""}
              onClick={() => toggle(school)}
            >
              {school}
            </button>
          ))}
        </div>
      </article>

      {!comparisonRows.length ? (
        <EmptyState
          title="비교 대학을 선택하세요."
          description="위 목록에서 관심 대학을 선택하면 비교 차트가 표시됩니다."
        />
      ) : (
        <>
          <section className="two-column equal">
            <article className="panel">
              <PanelHeader title="충원율 비교" />
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={comparisonRows}
                  layout="vertical"
                  margin={{ left: 40, right: 35 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, "auto"]} />
                  <YAxis
                    type="category"
                    dataKey="school"
                    width={140}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <ReferenceLine x={100} stroke="#94A3B8" />
                  <Bar dataKey="fillRate" fill="#176B87" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>
            <article className="panel">
              <PanelHeader title="경쟁률 비교" />
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={comparisonRows}
                  layout="vertical"
                  margin={{ left: 40, right: 35 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="school"
                    width={140}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}대 1`} />
                  <Bar
                    dataKey="competitionRate"
                    fill="#2A9D8F"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </article>
          </section>
          <article className="panel">
            <PanelHeader title="선택 대학 상세" />
            <DataTable rows={comparisonRows} />
          </article>
        </>
      )}
    </div>
  );
}

function YearlyComparison({
  rows,
  years,
}: {
  rows: EnrollmentRow[];
  years: number[];
}) {
  if (years.length < 2) {
    return (
      <div className="notice-card warning">
        <AlertTriangle size={28} />
        <div>
          <h3>동일 공시 항목의 데이터가 2개 연도 이상 필요합니다.</h3>
          <p>
            현재 2025년 샘플은 ‘출신 고교 현황’이고 2026년만 ‘충원
            현황’이므로 충원 지표를 직접 비교할 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  const baseYear = years[years.length - 2];
  const compareYear = years[years.length - 1];
  const base = rows.filter((row) => row.year === baseYear);
  const compare = rows.filter((row) => row.year === compareYear);
  const baseMap = new Map(base.map((row) => [row.school, row]));

  const yoy = compare
    .filter((row) => baseMap.has(row.school))
    .map((row) => {
      const old = baseMap.get(row.school)!;
      return {
        school: row.school,
        region: row.region,
        recruitChange: row.recruitIn - old.recruitIn,
        applicantChange: row.applicantIn - old.applicantIn,
        entrantChange: row.entrantIn - old.entrantIn,
        fillRateChange: row.fillRate - old.fillRate,
        competitionChange: row.competitionRate - old.competitionRate,
      };
    })
    .sort((a, b) => b.fillRateChange - a.fillRateChange);

  return (
    <div className="page-stack">
      <div className="notice-card info">
        <TrendingUp size={28} />
        <div>
          <h3>
            {baseYear}년 대비 {compareYear}년 비교
          </h3>
          <p>학교명이 동일한 기관만 자동 매칭합니다.</p>
        </div>
      </div>
      <article className="panel">
        <PanelHeader title="전년 증감표" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>학교</th>
                <th>지역</th>
                <th>모집인원 증감</th>
                <th>지원자 증감</th>
                <th>입학자 증감</th>
                <th>충원율 증감</th>
                <th>경쟁률 증감</th>
              </tr>
            </thead>
            <tbody>
              {yoy.map((row) => (
                <tr key={row.school}>
                  <td className="school-cell">{row.school}</td>
                  <td>{row.region}</td>
                  <td>{formatSigned(row.recruitChange)}</td>
                  <td>{formatSigned(row.applicantChange)}</td>
                  <td>{formatSigned(row.entrantChange)}</td>
                  <td>{formatSigned(row.fillRateChange, 1)}%p</td>
                  <td>{formatSigned(row.competitionChange, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function Validation({ parsedFiles }: { parsedFiles: ParsedFile[] }) {
  const issues = parsedFiles.flatMap((file) =>
    file.issues.map((issue) => ({ file: file.filename, ...issue })),
  );
  const mismatch =
    new Set(parsedFiles.map((file) => file.datasetType)).size > 1;

  return (
    <div className="page-stack">
      {mismatch && (
        <div className="notice-card warning">
          <AlertTriangle size={28} />
          <div>
            <h3>업로드 파일의 공시 항목이 서로 다릅니다.</h3>
            <p>
              서로 다른 공시 항목은 연도별 충원율 비교에 함께 사용할 수
              없습니다.
            </p>
          </div>
        </div>
      )}

      <article className="panel">
        <PanelHeader
          title="파일 판별 결과"
          description="파일명이 아니라 표 제목과 헤더를 기준으로 판별합니다."
        />
        <div className="file-grid">
          {parsedFiles.map((file) => (
            <div className="file-card" key={file.filename}>
              <div className="file-card__icon">
                <FileSpreadsheet size={24} />
              </div>
              <div className="file-card__content">
                <strong>{file.filename}</strong>
                <span>{file.title || "표 제목 없음"}</span>
                <div className="file-card__meta">
                  <em>{file.datasetType}</em>
                  <span>{file.year ? `${file.year}년` : "연도 미확인"}</span>
                  <span>{file.rowCount}행</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <PanelHeader title={`검증 메시지 ${issues.length}건`} />
        <div className="issue-list">
          {issues.map((issue, index) => (
            <div
              className={`issue-item issue-item--${issue.severity}`}
              key={`${issue.file}-${index}`}
            >
              {severityIcon(issue.severity)}
              <div>
                <strong>
                  {issue.severity} · {issue.category}
                </strong>
                <p>{issue.message}</p>
                <span>{issue.file}</span>
              </div>
            </div>
          ))}
          {!issues.length && (
            <div className="success-message">
              <CheckCircle2 size={22} />
              발견된 검증 이슈가 없습니다.
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function Reports({
  rows,
  files,
  filters,
  originCount,
}: {
  rows: EnrollmentRow[];
  files: ParsedFile[];
  filters: {
    year: number;
    schoolTypes: string[];
    regions: string[];
    ownerships: string[];
    excludeZero: boolean;
  };
  originCount: number;
}) {
  const summary = calculateSummary(rows);

  return (
    <div className="page-stack">
      <section className="report-grid">
        <article className="report-card">
          <div className="report-card__icon excel">
            <FileSpreadsheet size={30} />
          </div>
          <div>
            <h3>Excel 분석 결과</h3>
            <p>
              요약, 정제 데이터, 지역 분석, 검증 로그가 포함된 통합
              워크북입니다.
            </p>
          </div>
          <button
            onClick={() => downloadExcelReport(rows, files, filters)}
            disabled={!rows.length}
          >
            <Download size={17} />
            Excel 다운로드
          </button>
        </article>

        <article className="report-card">
          <div className="report-card__icon word">
            <FileText size={30} />
          </div>
          <div>
            <h3>Word 분석 보고서</h3>
            <p>
              핵심 지표, 분석 요약, 충원율 하위 기관 및 해석 유의사항을
              제공합니다.
            </p>
          </div>
          <button
            onClick={() => downloadWordReport(rows, filters)}
            disabled={!rows.length}
          >
            <Download size={17} />
            Word 다운로드
          </button>
        </article>
      </section>

      <article className="panel">
        <PanelHeader title="현재 보고서 기준" />
        <div className="report-summary">
          <div>
            <span>분석연도</span>
            <strong>{filters.year}년</strong>
          </div>
          <div>
            <span>기관 수</span>
            <strong>{summary.institutionCount}개</strong>
          </div>
          <div>
            <span>가중 충원율</span>
            <strong>{summary.fillRate.toFixed(2)}%</strong>
          </div>
          <div>
            <span>가중 경쟁률</span>
            <strong>{summary.competitionRate.toFixed(2)}대 1</strong>
          </div>
          <div>
            <span>출신 고교 데이터</span>
            <strong>{originCount.toLocaleString()}행</strong>
          </div>
        </div>
      </article>

      <div className="notice-card info">
        <ShieldCheck size={28} />
        <div>
          <h3>보고서에 분석 조건이 함께 기록됩니다.</h3>
          <p>
            학교종류, 지역, 설립구분, 모집인원 0 제외 여부가 다운로드
            파일에 반영됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

function DataTable({ rows }: { rows: EnrollmentRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>학교</th>
            <th>지역</th>
            <th>설립</th>
            <th>모집인원</th>
            <th>지원자</th>
            <th>입학자</th>
            <th>충원율</th>
            <th>경쟁률</th>
            <th>미충원</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.school}-${index}`}>
              <td className="school-cell">{row.school}</td>
              <td>{row.region}</td>
              <td>{row.ownership}</td>
              <td>{formatNumber(row.recruitIn)}</td>
              <td>{formatNumber(row.applicantIn)}</td>
              <td>{formatNumber(row.entrantIn)}</td>
              <td>
                <span
                  className={`rate-pill ${
                    row.fillRate < 95 ? "danger" : "normal"
                  }`}
                >
                  {row.fillRate.toFixed(1)}%
                </span>
              </td>
              <td>{row.competitionRate.toFixed(1)}대 1</td>
              <td>{formatNumber(row.unfilled)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: EnrollmentRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{row.school}</strong>
      <span>
        {row.region} · {row.ownership}
      </span>
      <p>충원율 {row.fillRate.toFixed(1)}%</p>
      <p>경쟁률 {row.competitionRate.toFixed(1)}대 1</p>
      <p>모집인원 {formatNumber(row.recruitIn)}명</p>
    </div>
  );
}

function formatSigned(value: number, digits = 0): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, digits)}`;
}

export default App;
