import '@testing-library/jest-dom/vitest';

// jsdom implements neither the Pointer Events capture API nor
// scrollIntoView, both of which Radix UI's interactive primitives (Select,
// Dropdown Menu, Dialog...) call unconditionally. Without these, opening a
// Radix Select in a test throws `target.hasPointerCapture is not a
// function` before userEvent ever gets to click an option.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
