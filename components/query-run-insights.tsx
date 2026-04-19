import styles from "@/app/queries/queries.module.css";

type QueryRunInsight = {
  id: string;
  createdAt: Date;
  resultCount: number;
  partial: boolean;
  triggerType: string;
  savedQuery: {
    title: string;
  } | null;
};

type QueryRunInsightsProps = {
  runs: QueryRunInsight[];
  selectedStatus?: string;
  selectedTriggerType?: string;
};

type BarDatum = {
  label: string;
  value: number;
};

function formatDayLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildTrendData(runs: QueryRunInsight[]) {
  const buckets = new Map<string, { date: Date; count: number; totalResults: number }>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    buckets.set(date.toISOString(), {
      date,
      count: 0,
      totalResults: 0
    });
  }

  for (const run of runs) {
    const date = new Date(run.createdAt);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString();
    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    bucket.count += 1;
    bucket.totalResults += run.resultCount ?? 0;
  }

  return [...buckets.values()];
}

function buildTopSubscriptions(runs: QueryRunInsight[]) {
  const groups = new Map<string, { label: string; resultCount: number; runCount: number }>();

  for (const run of runs) {
    const label = run.savedQuery?.title ?? "未知订阅";
    const current = groups.get(label) ?? {
      label,
      resultCount: 0,
      runCount: 0
    };

    current.resultCount += run.resultCount ?? 0;
    current.runCount += 1;
    groups.set(label, current);
  }

  return [...groups.values()]
    .sort((left, right) => {
      if (right.resultCount !== left.resultCount) {
        return right.resultCount - left.resultCount;
      }

      return right.runCount - left.runCount;
    })
    .slice(0, 5);
}

function buildResultBuckets(runs: QueryRunInsight[]): BarDatum[] {
  const groups = [
    { label: "0 条", min: 0, max: 0 },
    { label: "1-5 条", min: 1, max: 5 },
    { label: "6-10 条", min: 6, max: 10 },
    { label: "11+ 条", min: 11, max: Number.POSITIVE_INFINITY }
  ];

  return groups.map((group) => ({
    label: group.label,
    value: runs.filter(
      (run) => run.resultCount >= group.min && run.resultCount <= group.max
    ).length
  }));
}

function buildTriggerBuckets(runs: QueryRunInsight[]): BarDatum[] {
  const labelMap = new Map<string, string>([
    ["manual", "手动"],
    ["scheduled", "定时"],
    ["retry", "重试"]
  ]);

  const groups = new Map<string, number>();

  for (const run of runs) {
    const label = labelMap.get(run.triggerType) ?? run.triggerType;
    groups.set(label, (groups.get(label) ?? 0) + 1);
  }

  return [...groups.entries()].map(([label, value]) => ({ label, value }));
}

function describeScope(selectedStatus?: string, selectedTriggerType?: string) {
  if (selectedStatus === "completed") {
    return "当前聚焦成功运行样本，适合观察哪些订阅持续产出结果。";
  }

  if (selectedStatus === "failed") {
    return "当前聚焦失败样本，适合定位哪些订阅更容易出问题。";
  }

  if (selectedTriggerType === "retry") {
    return "当前聚焦自动重试样本，适合判断恢复质量和问题集中区。";
  }

  return "图表基于当前筛选范围生成，用来快速判断运行密度、产出分布和订阅贡献。";
}

function StatBarChart({
  data,
  valueLabel
}: {
  data: Array<{ label: string; value: number; sublabel?: string }>;
  valueLabel: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className={styles.chartBars} role="img" aria-label={valueLabel}>
      {data.map((item) => (
        <div className={styles.chartBarColumn} key={item.label}>
          <div className={styles.chartBarTrack}>
            <div
              className={styles.chartBarFill}
              style={{
                height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%`
              }}
            />
          </div>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
          {item.sublabel ? <small>{item.sublabel}</small> : null}
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({
  data,
  valueSuffix
}: {
  data: Array<{ label: string; value: number; meta?: string }>;
  valueSuffix?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className={styles.horizontalBars}>
      {data.map((item) => (
        <div className={styles.horizontalBarRow} key={item.label}>
          <div className={styles.horizontalBarHeader}>
            <strong>{item.label}</strong>
            <span>
              {item.value}
              {valueSuffix ?? ""}
            </span>
          </div>
          <div className={styles.horizontalBarTrack}>
            <div
              className={styles.horizontalBarFill}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          {item.meta ? <small>{item.meta}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function QueryRunInsights({
  runs,
  selectedStatus,
  selectedTriggerType
}: QueryRunInsightsProps) {
  if (!runs.length) {
    return null;
  }

  const trendData = buildTrendData(runs).map((item) => ({
    label: formatDayLabel(item.date),
    value: item.count,
    sublabel: `${item.totalResults} 条结果`
  }));
  const topSubscriptions = buildTopSubscriptions(runs).map((item) => ({
    label: item.label,
    value: item.resultCount,
    meta: `${item.runCount} 次运行`
  }));
  const resultBuckets = buildResultBuckets(runs);
  const triggerBuckets = buildTriggerBuckets(runs);
  const totalResults = runs.reduce((sum, run) => sum + (run.resultCount ?? 0), 0);
  const partialCount = runs.filter((run) => run.partial).length;
  const averageResults = totalResults / runs.length;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div className="stack">
          <h2>运行分析视图</h2>
          <p className={styles.muted}>{describeScope(selectedStatus, selectedTriggerType)}</p>
        </div>
      </div>

      <div className={styles.analyticsSummaryGrid}>
        <article className={styles.analyticsSummaryCard}>
          <span className={styles.summaryLabel}>样本运行数</span>
          <strong>{runs.length}</strong>
          <p className={styles.muted}>当前筛选范围内用于分析的运行记录数量</p>
        </article>
        <article className={styles.analyticsSummaryCard}>
          <span className={styles.summaryLabel}>平均结果数</span>
          <strong>{averageResults.toFixed(1)}</strong>
          <p className={styles.muted}>每次运行平均产出的仓库结果条数</p>
        </article>
        <article className={styles.analyticsSummaryCard}>
          <span className={styles.summaryLabel}>部分结果占比</span>
          <strong>{Math.round((partialCount / runs.length) * 100)}%</strong>
          <p className={styles.muted}>出现 partial 的运行比例，便于判断采集完整度</p>
        </article>
      </div>

      <div className={styles.analyticsGrid}>
        <article className={styles.analyticsCard}>
          <div className={styles.analyticsCardHead}>
            <div>
              <h3>最近 7 天运行趋势</h3>
              <p className={styles.muted}>看当前筛选后的运行密度和单日产出是否持续。</p>
            </div>
          </div>
          <StatBarChart data={trendData} valueLabel="最近 7 天运行趋势图" />
        </article>

        <article className={styles.analyticsCard}>
          <div className={styles.analyticsCardHead}>
            <div>
              <h3>订阅贡献排行</h3>
              <p className={styles.muted}>按结果总量聚合，帮助识别最稳定出结果的订阅。</p>
            </div>
          </div>
          <HorizontalBars data={topSubscriptions} valueSuffix=" 条" />
        </article>

        <article className={styles.analyticsCard}>
          <div className={styles.analyticsCardHead}>
            <div>
              <h3>结果量分布</h3>
              <p className={styles.muted}>看这批运行更偏向空结果、小样本还是高产出。</p>
            </div>
          </div>
          <StatBarChart data={resultBuckets} valueLabel="结果量分布图" />
        </article>

        <article className={styles.analyticsCard}>
          <div className={styles.analyticsCardHead}>
            <div>
              <h3>触发方式构成</h3>
              <p className={styles.muted}>确认这批样本更多来自手动、定时还是自动重试。</p>
            </div>
          </div>
          <HorizontalBars data={triggerBuckets} valueSuffix=" 次" />
        </article>
      </div>
    </section>
  );
}
