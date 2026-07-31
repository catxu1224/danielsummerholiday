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
const LOCAL_PLAN_KEY = "daniel-summer-plan-v1";

function currentSummerDateKey() {
  const now = new Date();
  const today = keyOf(now);
  if (today < "2026-07-01") return "2026-07-01";
  if (today > "2026-08-31") return "2026-08-31";
  return today;
}

function baseItems(key: string, offDays: string[]): Item[] {
  const date = parseKey(key);
  const day = date.getDay();
  const items: Item[] = [];
  if (day >= 1 && day <= 5 && !offDays.includes(key)) {
    items.push({ id: `${key}-arrival`, time: "08:30–09:00", title: "去学校", kind: "class" });
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
  custom,
  special,
  scheduleOverrides,
  onSelect,
}: {
  month: number;
  selected: string;
  offDays: string[];
  progress: Record<string, boolean>;
  custom: Record<string, Item[]>;
  special: Record<string, string>;
  scheduleOverrides: Record<string, Partial<Item> & { deleted?: boolean }>;
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
          const dayItems = [
            ...baseItems(key, offDays).map((item) => ({ ...item, ...scheduleOverrides[item.id] })),
            ...(custom[key] || []),
          ].filter((item) => !(item as Item & { deleted?: boolean }).deleted);
          const icons = [
            dayItems.some((item) => item.kind === "class") ? "📚" : "",
            dayItems.some((item) => item.title.includes("钢琴")) ? "🎹" : "",
            dayItems.some((item) => /体能|体育|运动|足球|篮球|游泳|跑步/.test(item.title)) ? "⚽" : "",
            dayItems.some((item) => /画|绘|美术/.test(item.title)) ? "🎨" : "",
          ].filter(Boolean);
          return (
            <button
              key={key}
              className={`${selected === key ? "selected" : ""} ${classDay ? "class-day" : ""} ${off ? "off-day" : ""}`}
              onClick={() => onSelect(key)}
              aria-label={`${month}月${day}日${classDay ? "，上课" : "，不上课"}`}
            >
              {special[key] && <b className="special-emoji">{special[key]}</b>}
              <span className="date-number">{day}</span>
              <span className="activity-icons">{icons.map((icon, index) => <i key={`${icon}-${index}`}>{icon}</i>)}</span>
              {progress[key] && <b className="date-check">✓</b>}
              {off && icons.length === 0 && <small className="rest-label">休</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const [selected, setSelected] = useState("2026-07-01");
  const [offDays, setOffDays] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, Partial<Item>>>({});
  const [custom, setCustom] = useState<Record<string, Item[]>>({});
  const [special, setSpecial] = useState<Record<string, string>>({});
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, Partial<Item> & { deleted?: boolean }>>({});
  const [syncState, setSyncState] = useState<"loading" | "saved" | "saving" | "local" | "offline">("loading");
  const [editing, setEditing] = useState<Item | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);
  const [newTask, setNewTask] = useState({ title: "", time: "18:30" });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const recognitionRef = useRef<any>(null);
  const pendingSavesRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const planRef = useRef({
    offDays: [] as string[],
    records: {} as Record<string, Partial<Item>>,
    custom: {} as Record<string, Item[]>,
    special: {} as Record<string, string>,
    scheduleOverrides: {} as Record<string, Partial<Item> & { deleted?: boolean }>,
  });

  const applyPlan = (data: any) => {
    const plan = {
      offDays: data.offDays || [],
      records: data.records || {},
      custom: data.custom || {},
      special: data.special || {},
      scheduleOverrides: data.scheduleOverrides || {},
    };
    setOffDays(plan.offDays);
    setRecords(plan.records);
    setCustom(plan.custom);
    setSpecial(plan.special);
    setScheduleOverrides(plan.scheduleOverrides);
    planRef.current = plan;
    return plan;
  };

  const loadCloudState = () => {
    setSyncState("loading");
    let local: { data: typeof planRef.current; updatedAt: string } | null = null;
    try {
      const cached = window.localStorage.getItem(LOCAL_PLAN_KEY);
      if (cached) local = JSON.parse(cached);
    } catch {
      local = null;
    }
    if (local?.data) applyPlan(local.data);
    fetch("/api/plan", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => {
      if (!data || data.synced === false) {
        setSyncState(local ? "local" : "offline");
        return;
      }
      const cloudIsNewer = Boolean(data.updatedAt) && (!local?.updatedAt || data.updatedAt >= local.updatedAt);
      if (cloudIsNewer || !local) {
        const cloudPlan = applyPlan(data);
        window.localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ data: cloudPlan, updatedAt: data.updatedAt || new Date().toISOString() }));
        setSyncState("saved");
      } else {
        setSyncState("saving");
        fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(local.data),
        }).then((r) => r.ok ? r.json() : Promise.reject()).then((result) => {
          if (!result?.saved) throw new Error("Cloud save failed");
          window.localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ data: local!.data, updatedAt: result.updatedAt }));
          setSyncState("saved");
        }).catch(() => setSyncState("offline"));
      }
    }).catch(() => setSyncState(local ? "local" : "offline"));
  };

  useEffect(() => {
    setSelected(currentSummerDateKey());
    loadCloudState();
    const onFocus = () => {
      if (document.visibilityState === "visible" && pendingSavesRef.current === 0) loadCloudState();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // The cloud loader intentionally runs once and again when this device returns to the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (next: { offDays?: string[]; records?: Record<string, Partial<Item>>; custom?: Record<string, Item[]>; special?: Record<string, string>; scheduleOverrides?: Record<string, Partial<Item> & { deleted?: boolean }> }) => {
    planRef.current = { ...planRef.current, ...next };
    const body = structuredClone(planRef.current);
    const localUpdatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ data: body, updatedAt: localUpdatedAt }));
    } catch {
      // Cloud saving still proceeds when device storage is unavailable.
    }
    pendingSavesRef.current += 1;
    setSyncState("saving");
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = response.ok ? await response.json() : null;
      if (!result?.saved || !result?.verified) throw new Error("Cloud save failed");
      try {
        window.localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ data: body, updatedAt: result.updatedAt || localUpdatedAt }));
      } catch {
        // The cloud copy is authoritative when device storage is unavailable.
      }
    }).then(() => {
      pendingSavesRef.current -= 1;
      if (pendingSavesRef.current === 0) setSyncState("saved");
    }).catch(() => {
      pendingSavesRef.current -= 1;
      setSyncState("local");
    });
  };

  const applyExistingTaskEdit = (draft: { title: string; time: string }) => {
    if (!editingTaskId) return;
    const isCustom = (custom[selected] || []).some((item) => item.id === editingTaskId);
    if (isCustom) {
      const next = {
        ...custom,
        [selected]: (custom[selected] || []).map((item) =>
          item.id === editingTaskId ? { ...item, title: draft.title, time: draft.time } : item
        ),
      };
      setCustom(next);
      save({ custom: next });
    } else {
      const next = {
        ...scheduleOverrides,
        [editingTaskId]: { ...scheduleOverrides[editingTaskId], title: draft.title, time: draft.time },
      };
      setScheduleOverrides(next);
      save({ scheduleOverrides: next });
    }
  };

  const updateTaskDraft = (draft: { title: string; time: string }) => {
    setNewTask(draft);
    if (editingTaskId) applyExistingTaskEdit(draft);
  };

  const items = useMemo(() => [
    ...baseItems(selected, offDays).map((item) => ({ ...item, ...scheduleOverrides[item.id] })),
    ...(custom[selected] || []),
  ].filter((item) => !(item as Item & { deleted?: boolean }).deleted).map((item) => ({ ...item, ...records[item.id] }))
    .sort((a, b) => a.time.localeCompare(b.time)), [selected, offDays, custom, records, scheduleOverrides]);

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
    if (editingTaskId) {
      applyExistingTaskEdit({ title: newTask.title.trim(), time: newTask.time });
      setEditingTaskId(null);
      setNewTask({ title: "", time: "18:30" });
      return;
    }
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

  const startEditTask = (item: Item) => {
    setEditingTaskId(item.id);
    setNewTask({ title: item.title, time: item.time });
    requestAnimationFrame(() => document.getElementById("free-activity-form")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setNewTask({ title: "", time: "18:30" });
  };

  const deleteCustomTask = () => {
    if (!deleteTarget) return;
    const isCustom = (custom[selected] || []).some((item) => item.id === deleteTarget.id);
    const nextRecords = { ...records };
    delete nextRecords[deleteTarget.id];
    setRecords(nextRecords);
    if (isCustom) {
      const nextCustom = {
        ...custom,
        [selected]: (custom[selected] || []).filter((item) => item.id !== deleteTarget.id),
      };
      setCustom(nextCustom);
      save({ custom: nextCustom, records: nextRecords });
    } else {
      const nextOverrides = {
        ...scheduleOverrides,
        [deleteTarget.id]: { ...scheduleOverrides[deleteTarget.id], deleted: true },
      };
      setScheduleOverrides(nextOverrides);
      save({ scheduleOverrides: nextOverrides, records: nextRecords });
    }
    if (editingTaskId === deleteTarget.id) cancelEditTask();
    setDeleteTarget(null);
  };

  const updateSpecial = (value: string) => {
    const next = { ...special };
    if (value.trim()) next[selected] = value.trim();
    else delete next[selected];
    setSpecial(next);
    save({ special: next });
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
        <div className="brand"><span className="logo">D</span><div><strong>Daniel的小小暑假</strong><small>成长计划 · 2026</small></div></div>
        <div className="header-actions">
          <div className={`sync-status ${syncState}`}>
            <i />
            <span>{syncState === "saving" ? "正在同步" : syncState === "loading" ? "读取云端" : syncState === "saved" ? "已云端同步" : syncState === "local" ? "仅本机保存" : "同步失败"}</span>
          </div>
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
              <Month month={7} selected={selected} offDays={offDays} progress={progressByDate} custom={custom} special={special} scheduleOverrides={scheduleOverrides} onSelect={setSelected} />
              <Month month={8} selected={selected} offDays={offDays} progress={progressByDate} custom={custom} special={special} scheduleOverrides={scheduleOverrides} onSelect={setSelected} />
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
            <div className="special-card">
              <label htmlFor="special-emoji">今天的特别活动</label>
              <div>
                <input
                  id="special-emoji"
                  aria-label="特别活动 Emoji"
                  value={special[selected] || ""}
                  maxLength={8}
                  onChange={(e) => updateSpecial(e.target.value)}
                  placeholder="🏰"
                />
                <span>输入一个 Emoji，例如去迪士尼用 🏰</span>
              </div>
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
                <div className="task-actions">
                  <button className="manage-btn" onClick={() => startEditTask(item)} aria-label={`修改${item.title}`}>✎</button>
                  <button className="manage-btn delete" onClick={() => setDeleteTarget(item)} aria-label={`删除${item.title}`}>×</button>
                  <button className="note-btn" onClick={() => setEditing(item)} aria-label={`记录${item.title}体验`}>☻</button>
                </div>
                <button className="check-btn" onClick={() => toggleComplete(item)} aria-label={`${item.completed ? "取消" : ""}完成${item.title}`}>{item.completed ? "✓" : ""}</button>
              </article>
            ))}

            <div className={`add-card ${editingTaskId ? "editing" : ""}`} id="free-activity-form">
              <div><span>{editingTaskId ? "✎" : "＋"}</span><div><h3>{editingTaskId ? "修改当天安排" : "添加自由活动"}</h3><p>{editingTaskId ? "输入内容会自动保存，仅影响所选日期" : "画画、阅读、和朋友玩……"}</p></div></div>
              <div className="add-form">
                <input aria-label="活动时间" type="time" value={newTask.time} onChange={(e) => updateTaskDraft({ ...newTask, time: e.target.value })} />
                <input aria-label="活动内容" placeholder="今天还想做什么？" value={newTask.title} onChange={(e) => updateTaskDraft({ ...newTask, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addTask()} />
                <button onClick={addTask}>{editingTaskId ? "完成" : "添加"}</button>
              </div>
              {editingTaskId && <button className="cancel-edit" onClick={cancelEditTask}>取消修改</button>}
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

      {deleteTarget && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <section className="confirm-card" role="alertdialog" aria-modal="true" aria-label="确认删除活动">
            <span>🗑️</span>
            <h2>删除这个活动？</h2>
            <p>“{deleteTarget.title}”及其打卡和体验记录都会从这一天删除，其他日期不受影响。</p>
            <div>
              <button onClick={() => setDeleteTarget(null)}>保留活动</button>
              <button className="danger" onClick={deleteCustomTask}>确认删除</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
