"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  title: string;
  time: string;
  kind: "class" | "fixed" | "free";
  completed?: boolean;
  note?: string;
  mood?: string;
};

const moods = [
  ["🤩", "兴奋"],
  ["😊", "开心"],
  ["😌", "舒适"],
  ["😟", "焦虑"],
  ["😭", "哭泣"],
  ["😫", "疲惫"],
  ["😐", "无感"],
];

const classSchedule: Record<number, [string, string][]> = {
  1: [["09:00–10:20", "拼音"], ["10:30–11:50", "数学思维"], ["13:00–14:20", "英语"], ["14:40–15:50", "识字"]],
  2: [["09:00–10:20", "拼音"], ["10:30–11:50", "数学思维"], ["13:00–14:20", "英语"], ["14:40–15:50", "语言表达"]],
  3: [["09:00–10:20", "拼音"], ["10:30–11:50", "数学思维"], ["13:00–14:20", "英语"], ["14:40–15:50", "益智游戏"]],
  4: [["09:00–10:20", "拼音"], ["10:30–11:50", "数学思维"], ["13:00–14:20", "英语"], ["14:40–15:50", "手工 / 体育"]],
  5: [["09:00–10:20", "拼音"], ["10:30–11:50", "数学思维"], ["13:00–14:20", "英语"], ["14:40–15:50", "综合测试"]],
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (key: string) => new Date(`${key}T12:00:00`);
const cnWeek = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function baseItems(key: string, offDays: string[]): Item[] {
  const date = parseKey(key);
  const day = date.getDay();
  const items: Item[] = [];
  if (day >= 1 && day <= 5 && !offDays.includes(key)) {
    items.push({ id: `${key}-arrival`, time: "08:30–09:00", title: "入园时间", kind: "class" });
    classSchedule[day].forEach(([time, title], i) =>
      items.push({ id: `${key}-c${i}`, time, title, kind: "class" })
    );
  }
  if (day === 6) items.push({ id: `${key}-piano-class`, time: "10:30–11:30", title: "艺点通钢琴课", kind: "fixed" });
  if (day === 0) {
    items.push({ id: `${key}-fitness`, time: "11:20–12:10", title: "亚东体育体能课", kind: "fixed" });
    items.push({ id: `${key}-rise`, time: "14:00–17:10", title: "瑞思英语", kind: "fixed" });
  }
  if (day === 2 || day === 4) items.push({ id: `${key}-piano-practice`, time: "17:00–18:00", title: "钢琴练习", kind: "fixed" });
  return items;
}

function Month({
  month,
  selected,
  offDays,
  progress,
  onSelect,
}: {
  month: number;
  selected: string;
  offDays: string[];
  progress: Record<string, boolean>;
  onSelect: (key: string) => void;
}) {
  const first = new Date(2026, month - 1, 1);
  const total = new Date(2026, month, 0).getDate();
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return (
    <section className="month-card">
      <div className="month-title"><span>2026</span><strong>{month}月</strong></div>
      <div className="week-row">{["日", "一", "二", "三", "四", "五", "六"].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="date-grid">
        {cells.map((day, i) => {
          if (!day) return <span className="blank" key={`b${i}`} />;
          const key = `2026-${pad(month)}-${pad(day)}`;
          const weekday = new Date(2026, month - 1, day).getDay();
          const classDay = weekday >= 1 && weekday <= 5 && !offDays.includes(key);
          const off = weekday >= 1 && weekday <= 5 && offDays.includes(key);
          return (
            <button
              key={key}
              className={`${selected === key ? "selected" : ""} ${classDay ? "class-day" : ""} ${off ? "off-day" : ""}`}
              onClick={() => onSelect(key)}
              aria-label={`${month}月${day}日${classDay ? "，上课" : "，不上课"}`}
            >
              <span>{day}</span>
              <i>{progress[key] ? "✓" : classDay ? "课" : off ? "休" : ""}</i>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const [selected, setSelected] = useState("2026-07-30");
  const [offDays, setOffDays] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, Partial<Item>>>({});
  const [custom, setCustom] = useState<Record<string, Item[]>>({});
  const [editing, setEditing] = useState<Item | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);
  const [newTask, setNewTask] = useState({ title: "", time: "18:30" });
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/plan").then((r) => r.ok ? r.json() : null).then((data) => {
      if (!data) return;
      setOffDays(data.offDays || []);
      setRecords(data.records || {});
      setCustom(data.custom || {});
    }).catch(() => {});
  }, []);

  const save = (next: { offDays?: string[]; records?: Record<string, Partial<Item>>; custom?: Record<string, Item[]> }) => {
    const body = { offDays: next.offDays ?? offDays, records: next.records ?? records, custom: next.custom ?? custom };
    fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  };

  const items = useMemo(() => [
    ...baseItems(selected, offDays),
    ...(custom[selected] || []),
  ].map((item) => ({ ...item, ...records[item.id] }))
    .sort((a, b) => a.time.localeCompare(b.time)), [selected, offDays, custom, records]);

  const date = parseKey(selected);
  const weekday = date.getDay();
  const eligible = weekday >= 1 && weekday <= 5;
  const isOff = offDays.includes(selected);
  const completed = items.filter((i) => i.completed).length;
  const progressByDate = useMemo(() => {
    const out: Record<string, boolean> = {};
    Object.values(records).forEach((r: any) => { if (r.completed && r.id) out[r.id.slice(0, 10)] = true; });
    return out;
  }, [records]);
  const classCount = 44 - offDays.length;

  const toggleOff = () => {
    const next = isOff ? offDays.filter((d) => d !== selected) : [...offDays, selected];
    setOffDays(next);
    save({ offDays: next });
  };

  const toggleComplete = (item: Item) => {
    const next = { ...records, [item.id]: { ...records[item.id], id: item.id, completed: !item.completed } };
    setRecords(next);
    save({ records: next });
  };

  const saveReflection = () => {
    if (!editing) return;
    const next = { ...records, [editing.id]: { ...records[editing.id], id: editing.id, note: editing.note || "", mood: editing.mood || "" } };
    setRecords(next);
    save({ records: next });
    setEditing(null);
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const item: Item = {
      id: `${selected}-free-${Date.now()}`,
      title: newTask.title.trim(),
      time: newTask.time,
      kind: "free",
    };
    const next = { ...custom, [selected]: [...(custom[selected] || []), item] };
    setCustom(next);
    save({ custom: next });
    setNewTask({ title: "", time: "18:30" });
  };

  const startVoice = () => {
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech || !editing) return;
    const rec = new Speech();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.onresult = (e: any) => setEditing((x) => x ? { ...x, note: `${x.note || ""}${e.results[0][0].transcript}` } : x);
    rec.start();
    recognitionRef.current = rec;
  };

  return (
    <main>
      <div className="summer-decor" aria-hidden="true">
        <span className="blob blob-one" />
        <span className="blob blob-two" />
        <span className="blob blob-three" />
        <span className="animal animal-bear">🐻<i>✦</i></span>
        <span className="animal animal-rabbit">🐰<i>♪</i></span>
        <span className="animal animal-duck">🐥<i>●</i></span>
        <span className="animal animal-whale">🐳<i>· · ·</i></span>
      </div>
      <header>
        <div className="brand"><span className="logo">夏</span><div><strong>小小暑期</strong><small>成长计划 · 2026</small></div></div>
        <div className="header-actions">
          <div className="streak"><span>☀️</span><b>{completed}</b><small>今日打卡</small></div>
          <button className="avatar" aria-label="个人中心">小</button>
        </div>
      </header>

      <div className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">SUMMER ADVENTURE</p>
            <h1>把每一天，<br /><em>过成喜欢的样子。</em></h1>
            <p className="hero-copy">学习、运动、音乐和玩耍，认真记录这个闪闪发光的夏天。</p>
          </div>
          <div className="hero-stats">
            <div><strong>{classCount}</strong><span>计划上课日</span></div>
            <div><strong>{offDays.length}</strong><span>调整休息日</span></div>
            <div><strong>9</strong><span>快乐成长周</span></div>
          </div>
          <div className="hero-friends" aria-hidden="true">
            <span className="leaf">☘</span>
            <span className="fox">🦊</span>
            <span className="butterfly">🦋</span>
          </div>
        </section>

        <nav className="tabs">
          <button className={showCalendar ? "active" : ""} onClick={() => setShowCalendar(true)}>暑期日历</button>
          <button className={!showCalendar ? "active" : ""} onClick={() => setShowCalendar(false)}>今日计划</button>
          <span>7月1日 — 8月31日</span>
        </nav>

        {showCalendar ? (
          <section className="calendar-wrap">
            <div className="calendar-heading">
              <div><p className="kicker">MY SUMMER CALENDAR</p><h2>我的暑假日历</h2></div>
              <div className="legend"><span><i className="dot orange" />上课日</span><span><i className="dot mint" />休息日</span><span><i className="check-dot">✓</i>已打卡</span></div>
            </div>
            <div className="months">
              <Month month={7} selected={selected} offDays={offDays} progress={progressByDate} onSelect={setSelected} />
              <Month month={8} selected={selected} offDays={offDays} progress={progressByDate} onSelect={setSelected} />
            </div>
          </section>
        ) : null}

        <section className="day-section">
          <aside className="day-intro">
            <p className="kicker">TODAY’S PLAN</p>
            <div className="date-display"><strong>{date.getDate()}</strong><div><b>{date.getMonth() + 1}月</b><span>{cnWeek[weekday]}</span></div></div>
            <p>{eligible && !isOff ? "今天是暑假班上课日，准备好开启充实的一天！" : "今天节奏轻松一点，享受自由安排的时间吧。"}</p>
            {eligible && <button className={`day-toggle ${isOff ? "restore" : ""}`} onClick={toggleOff}>{isOff ? "改为上课日" : "今天不上课"}</button>}
            <div className="progress-card">
              <div><span>今日完成</span><b>{completed} / {items.length}</b></div>
              <div className="bar"><i style={{ width: `${items.length ? completed / items.length * 100 : 0}%` }} /></div>
            </div>
          </aside>

          <div className="agenda">
            {items.length === 0 && <div className="empty"><span>🌿</span><h3>自由的一天</h3><p>没有固定安排，去发现今天想做的事吧。</p></div>}
            {items.map((item) => (
              <article className={`task ${item.completed ? "done" : ""}`} key={item.id}>
                <time>{item.time}</time>
                <div className={`kind ${item.kind}`}>{item.kind === "class" ? "学" : item.kind === "fixed" ? "趣" : "自"}</div>
                <div className="task-main">
                  <span className="tag">{item.kind === "class" ? "暑假班" : item.kind === "fixed" ? "固定课程" : "自由活动"}</span>
                  <h3>{item.title}</h3>
                  {(item.note || item.mood) && <p className="saved-note">{item.mood} {item.note}</p>}
                </div>
                <button className="note-btn" onClick={() => setEditing(item)} aria-label={`记录${item.title}体验`}>✎</button>
                <button className="check-btn" onClick={() => toggleComplete(item)} aria-label={`${item.completed ? "取消" : ""}完成${item.title}`}>{item.completed ? "✓" : ""}</button>
              </article>
            ))}

            <div className="add-card">
              <div><span>＋</span><div><h3>添加自由活动</h3><p>画画、阅读、和朋友玩……</p></div></div>
              <div className="add-form">
                <input aria-label="活动时间" type="time" value={newTask.time} onChange={(e) => setNewTask({ ...newTask, time: e.target.value })} />
                <input aria-label="活动内容" placeholder="今天还想做什么？" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addTask()} />
                <button onClick={addTask}>添加</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {editing && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="记录体验">
            <button className="modal-close" onClick={() => setEditing(null)}>×</button>
            <p className="kicker">MY LITTLE MOMENT</p>
            <h2>记录这一刻</h2>
            <p className="modal-task">{editing.time} · {editing.title}</p>
            <label>今天感觉怎么样？</label>
            <div className="moods">
              {moods.map(([emoji, label]) => <button key={label} className={editing.mood === emoji ? "active" : ""} onClick={() => setEditing({ ...editing, mood: emoji })}><span>{emoji}</span><small>{label}</small></button>)}
            </div>
            <label htmlFor="experience">写下你的体验</label>
            <div className="textarea-wrap">
              <textarea id="experience" value={editing.note || ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} placeholder="今天有什么有趣的事？学会了什么？" />
              <button onClick={startVoice} className="voice" title="语音输入">🎙️ <span>语音说一说</span></button>
            </div>
            <button className="save-btn" onClick={saveReflection}>保存记录</button>
          </section>
        </div>
      )}
    </main>
  );
}
