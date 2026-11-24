// 描画・イベント・localStorage の入出力。ロジックは todo.js に置く。
import {
  addTask,
  toggleTask,
  removeTask,
  filterTasks,
  countActive,
  serialize,
  deserialize,
} from './todo.js';

const STORAGE_KEY = 'todo-lab:v1';

const form = document.querySelector('#add-form');
const input = document.querySelector('#new-title');
const list = document.querySelector('#task-list');
const empty = document.querySelector('#empty');
const count = document.querySelector('#active-count');
const filterButtons = document.querySelectorAll('[data-filter]');

const state = { tasks: load(), filter: 'all' };

function load() {
  try {
    return deserialize(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state.tasks));
  } catch {
    // 保存できない環境でも、メモリ上では動かし続ける
  }
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 状態を更新して描画し、フォーカスを戻す。focusId の行が無ければ入力欄に戻す。
function update(tasks, focusId) {
  state.tasks = tasks;
  save();
  render();
  const row = focusId ? [...list.children].find((li) => li.dataset.id === focusId) : undefined;
  (row?.querySelector('input') ?? input).focus();
}

function render() {
  const visible = filterTasks(state.tasks, state.filter);
  list.replaceChildren(...visible.map(renderItem));
  empty.hidden = visible.length > 0;
  count.textContent = `未完了 ${countActive(state.tasks)} 件`;
  for (const button of filterButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
  }
}

// タイトルは textContent で入れる（HTML として解釈させない）。
function renderItem(task) {
  const item = document.createElement('li');
  item.className = task.done ? 'task done' : 'task';
  item.dataset.id = task.id;

  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = task.done;
  box.addEventListener('change', () => update(toggleTask(state.tasks, task.id), task.id));
  const title = document.createElement('span');
  title.textContent = task.title;
  label.append(box, title);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete';
  remove.textContent = '削除';
  remove.setAttribute('aria-label', `「${task.title}」を削除`);
  remove.addEventListener('click', () => update(removeTask(state.tasks, task.id)));

  item.append(label, remove);
  return item;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const next = addTask(state.tasks, input.value, { id: newId(), now: Date.now() });
  if (next === state.tasks) {
    input.focus();
    return;
  }
  input.value = '';
  update(next);
});

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    render();
  });
}

render();
