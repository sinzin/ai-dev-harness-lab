// 純粋なロジック。DOM・localStorage に触れない（NFR-003）。
// 操作関数は元の配列を変更せず、新しい配列を返す。

export function normalizeTitle(raw) {
  return String(raw ?? '').trim();
}

// 正規化後のタイトルが空なら、渡された配列をそのまま（同じ参照で）返す。
export function addTask(tasks, rawTitle, { id, now }) {
  const title = normalizeTitle(rawTitle);
  if (title === '') return tasks;
  return [...tasks, { id, title, done: false, createdAt: now }];
}

export function toggleTask(tasks, id) {
  return tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

// 'active' / 'done' 以外は 'all' として扱う。
export function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((task) => !task.done);
  if (filter === 'done') return tasks.filter((task) => task.done);
  return tasks;
}

export function countActive(tasks) {
  return tasks.filter((task) => !task.done).length;
}

export function serialize(tasks) {
  return JSON.stringify(tasks);
}

// 壊れた入力（null・不正な JSON・配列でない値）は空配列。形式の合わない要素は捨てる。
export function deserialize(json) {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data.filter(isTask) : [];
  } catch {
    return [];
  }
}

function isTask(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.done === 'boolean' &&
    Number.isFinite(value.createdAt)
  );
}
