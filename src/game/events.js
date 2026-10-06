// Yksinkertainen tapahtumaväylä pelin osien välille.
const listeners = new Map();

export const events = {
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(fn);
  },
  emit(name, data) {
    const list = listeners.get(name);
    if (list) for (const fn of list) fn(data);
  },
};
