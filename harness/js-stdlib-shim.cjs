'use strict';

// Harness-only shim for TSN stdlib methods that do not exist in plain JS.
// This keeps Node/Bun correctness and benchmark comparisons aligned with the
// compiler surface without changing user programs.
function defineArrayMethod(name, impl) {
  if (Object.prototype.hasOwnProperty.call(Array.prototype, name)) return;
  Object.defineProperty(Array.prototype, name, {
    value: impl,
    configurable: true,
    writable: true,
  });
}

defineArrayMethod('count', function count(predicate) {
  let total = 0;
  for (let i = 0; i < this.length; i += 1) {
    if (predicate(this[i], i, this)) total += 1;
  }
  return total;
});

defineArrayMethod('sum', function sum() {
  let total = 0;
  for (let i = 0; i < this.length; i += 1) {
    total += Number(this[i]);
  }
  return total;
});

defineArrayMethod('min', function min() {
  if (this.length === 0) return 0;
  let value = Number(this[0]);
  for (let i = 1; i < this.length; i += 1) {
    const current = Number(this[i]);
    if (current < value) value = current;
  }
  return value;
});

defineArrayMethod('max', function max() {
  if (this.length === 0) return 0;
  let value = Number(this[0]);
  for (let i = 1; i < this.length; i += 1) {
    const current = Number(this[i]);
    if (current > value) value = current;
  }
  return value;
});
