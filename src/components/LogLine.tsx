interface LogLineProps {
  line: string;
  index: number;
  format?: "harvest" | "app";
}

// harvest format: "YYYY-MM-DD HH:MM:SS LEVEL module — message"
const HARVEST_RE =
  /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+(\S+)\s+[—-]\s+(.*)$/i;

// simplelog actual formats observed:
//   "HH:MM:SS [LEVEL] message"          — brackets, no target
//   "HH:MM:SS [LEVEL] target: message"  — brackets, with target
//   "HH:MM:SS LEVEL target message"     — no brackets, with target word
const APP_RE =
  /^(\d{2}:\d{2}:\d{2})\s+\[?(TRACE|DEBUG|INFO|WARN|ERROR)]?\s+(.*)$/i;

type Level = "error" | "warning" | "info" | "debug";

function parseLevel(raw: string): Level {
  const u = raw.toUpperCase();
  if (u === "ERROR" || u === "CRITICAL") return "error";
  if (u === "WARNING" || u === "WARN") return "warning";
  if (u === "DEBUG" || u === "TRACE") return "debug";
  return "info";
}

const LEVEL_COLORS: Record<Level, string> = {
  error: "text-red-400",
  warning: "text-amber-500",
  info: "text-slate-300",
  debug: "text-slate-500",
};

const LEVEL_BORDERS: Record<Level, string> = {
  error: "border-l-2 border-red-400",
  warning: "border-l-2 border-amber-500",
  info: "",
  debug: "",
};

const STATUS_PATTERNS: [RegExp, string][] = [
  [/\b(OK|ready|acquired|started)\b/gi, "text-teal-400"],
  [/\b(failed|error|timeout)\b/gi, "text-red-400"],
  [/\b(warning|skip)\b/gi, "text-amber-500"],
];

function highlightStatus(text: string, baseClass: string) {
  const parts: { text: string; className: string }[] = [];
  let remaining = text;

  // Simple approach: split on status words
  const combined =
    /\b(OK|ready|acquired|started|failed|error|timeout|warning|skip)\b/gi;
  let match;
  let lastIndex = 0;
  const allText = remaining;

  combined.lastIndex = 0;
  while ((match = combined.exec(allText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: allText.slice(lastIndex, match.index),
        className: baseClass,
      });
    }
    const word = match[0];
    let cls = baseClass;
    for (const [pattern, color] of STATUS_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(word)) {
        cls = color + " font-semibold";
        break;
      }
    }
    parts.push({ text: word, className: cls });
    lastIndex = combined.lastIndex;
  }
  if (lastIndex < allText.length) {
    parts.push({ text: allText.slice(lastIndex), className: baseClass });
  }

  return parts;
}

export function LogLine({ line, index, format = "harvest" }: LogLineProps) {
  const zebra = index % 2 === 1 ? "bg-white/[0.02]" : "";
  const re = format === "app" ? APP_RE : HARVEST_RE;
  const match = line.match(re);

  if (!match) {
    // Fallback: check for stderr-style or plain line
    const upper = line.toUpperCase();
    let fallbackColor = "text-slate-300";
    let border = "";
    if (upper.includes("ERROR") || upper.includes("CRITICAL")) {
      fallbackColor = "text-red-400";
      border = "border-l-2 border-red-400";
    } else if (upper.includes("WARNING") || upper.includes("WARN")) {
      fallbackColor = "text-amber-500";
      border = "border-l-2 border-amber-500";
    } else if (upper.includes("DEBUG")) {
      fallbackColor = "text-slate-500";
    }
    return (
      <div className={`pl-2 ${border} ${zebra}`}>
        <span className={fallbackColor}>{line}</span>
      </div>
    );
  }

  let timestamp: string, levelRaw: string, module: string, message: string;
  if (format === "app") {
    timestamp = match[1];
    levelRaw = match[2];
    const rest = match[3] ?? "";
    // Try to extract "target: message" pattern
    const targetMatch = rest.match(/^(\S+?):\s+(.*)$/);
    if (targetMatch) {
      module = targetMatch[1];
      message = targetMatch[2];
    } else {
      module = "";
      message = rest;
    }
  } else {
    [, timestamp, levelRaw, module, message] = match;
  }
  const level = parseLevel(levelRaw);
  const levelColor = LEVEL_COLORS[level];
  const border = LEVEL_BORDERS[level];
  const messageParts = highlightStatus(message, levelColor);

  return (
    <div className={`pl-2 ${border} ${zebra}`}>
      <span className="text-slate-500">{timestamp}</span>{" "}
      <span className={`${levelColor} font-semibold`}>
        {levelRaw.toUpperCase()}
      </span>{" "}
      {module && <><span className="text-cyan-600">{module}</span>{" "}</>}
      {messageParts.map((p, i) => (
        <span key={i} className={p.className}>
          {p.text}
        </span>
      ))}
    </div>
  );
}
