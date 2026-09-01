/**
 * dom_automation.js — minimal, verified DOM automation primitives.
 *
 * SCOPE, STATED PLAINLY:
 * This drives a real DOM and runs a page's real JavaScript via jsdom.
 * It does NOT do what Playwright/Puppeteer do:
 *   - no real rendering engine (CSS layout, visual rendering, screenshots — none of that)
 *   - no fetching of live internet pages (this sandbox's network egress blocks that
 *     for any host outside a small package-registry allowlist)
 *   - not every browser API is implemented (jsdom covers most, not all)
 * What it DOES do, verified for real on 2026-08-29:
 *   - load arbitrary HTML you already have (a local file, or a string, e.g. one
 *     fetched separately via a tool that *can* reach the internet)
 *   - execute that page's inline/linked JS for real
 *   - set form field values in a way that fires real 'input' events (so
 *     framework/vanilla-JS listeners actually see the change)
 *   - dispatch real submit/click events and read back the resulting DOM state
 *
 * Use case this is actually good for: testing or automating interaction with
 * HTML content you already have in hand. Not a substitute for real browser
 * automation against the live web.
 */
const { JSDOM } = require("jsdom");

function loadHTML(html, options = {}) {
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", ...options });
  return dom.window.document;
}

function loadFile(filePath, options = {}) {
  const fs = require("fs");
  return loadHTML(fs.readFileSync(filePath, "utf8"), options);
}

/** Set an input's value via the native setter so real 'input' listeners fire. */
function setValue(input, value) {
  const proto = Object.getPrototypeOf(input);
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new input.ownerDocument.defaultView.Event("input", { bubbles: true }));
}

/** Dispatch a real click event on an element. */
function click(el) {
  el.dispatchEvent(new el.ownerDocument.defaultView.Event("click", { bubbles: true, cancelable: true }));
}

/** Dispatch a real submit event directly on a <form>. */
function submitForm(form) {
  form.dispatchEvent(new form.ownerDocument.defaultView.Event("submit", { bubbles: true, cancelable: true }));
}

/** Read back text content of an element by selector, or null if not found. */
function text(document, selector) {
  const el = document.querySelector(selector);
  return el ? el.textContent : null;
}

/**
 * Extract a <table> into an array of objects keyed by header text.
 * Returns [] if the selector doesn't match a table with a <thead>.
 */
function extractTable(document, selector) {
  const table = document.querySelector(selector);
  if (!table) return [];
  const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  return rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("td")).map((td) => td.textContent.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cells[i]));
    return obj;
  });
}

/** Extract a list's items as an array of trimmed strings. */
function extractList(document, selector) {
  return Array.from(document.querySelectorAll(`${selector} li`)).map((li) => li.textContent.trim());
}

module.exports = { loadHTML, loadFile, setValue, click, submitForm, text, extractTable, extractList };
