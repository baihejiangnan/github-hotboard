const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

const weekdayLabelMap = new Map<string, string>([
  ["0", "周日"],
  ["1", "周一"],
  ["2", "周二"],
  ["3", "周三"],
  ["4", "周四"],
  ["5", "周五"],
  ["6", "周六"]
]);

function formatTime(hourRaw: string, minuteRaw: string) {
  return `${hourRaw.padStart(2, "0")}:${minuteRaw.padStart(2, "0")}`;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "未记录";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未记录";
  }

  return dateTimeFormatter.format(date).replace(/\//g, "/");
}

export function getRankingModeLabel(mode?: string | null) {
  if (mode === "growth") {
    return "增长榜";
  }

  return "新锐热榜";
}

export function getRunStatusLabel(status?: string | null) {
  switch (status) {
    case "pending":
      return "排队中";
    case "running":
      return "运行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return "未知状态";
  }
}

export function getTriggerTypeLabel(triggerType?: string | null) {
  switch (triggerType) {
    case "scheduled":
      return "定时触发";
    case "retry":
      return "自动重试";
    case "manual":
    default:
      return "手动运行";
  }
}

export function getSubscriptionStateLabel(input: {
  isActive?: boolean | null;
  scheduleCron?: string | null;
  lastRunStatus?: string | null;
}) {
  if (!input.scheduleCron) {
    return "仅手动";
  }

  if (!input.isActive) {
    return "已暂停";
  }

  if (input.lastRunStatus === "failed") {
    return "启用中 · 最近失败";
  }

  if (input.lastRunStatus === "completed") {
    return "启用中 · 最近成功";
  }

  if (input.lastRunStatus === "running") {
    return "启用中 · 正在运行";
  }

  return "已启用";
}

export function getShareChannelLabel(channel?: string | null) {
  switch (channel) {
    case "xiaohongshu_post":
      return "小红书稿";
    case "wechat_article":
    default:
      return "公众号稿";
  }
}

export function getVideoFormatLabel(format?: string | null) {
  switch (format) {
    case "horizontal_90":
      return "90 秒横版";
    case "vertical_60":
    default:
      return "60 秒竖版";
  }
}

export function getVideoStatusLabel(status?: string | null) {
  switch (status) {
    case "queued":
      return "排队中";
    case "rendering":
      return "渲染中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return "未知状态";
  }
}

export function describeCron(cron?: string | null) {
  if (!cron) {
    return "仅手动运行";
  }

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return `自定义 Cron：${cron}`;
  }

  const [minuteRaw, hourRaw, dayOfMonth, month, weekdayRaw] = parts;

  if (dayOfMonth !== "*" || month !== "*") {
    return `自定义 Cron：${cron}`;
  }

  const time = formatTime(hourRaw, minuteRaw);

  if (weekdayRaw === "*") {
    return `每天 ${time}`;
  }

  if (weekdayRaw === "1-5") {
    return `工作日 ${time}`;
  }

  if (weekdayLabelMap.has(weekdayRaw)) {
    return `${weekdayLabelMap.get(weekdayRaw)} ${time}`;
  }

  return `自定义 Cron：${cron}`;
}
