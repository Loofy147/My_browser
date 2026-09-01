const { JSDOM } = require("jsdom");
const { defineAdapter, assertObservationEnvelope } = require("./adapter_contract");

function webObservation({ html, selector = "[data-subject-id]", sourceUri = "web://input" }) {
  if (typeof html !== "string") throw new TypeError("html must be a string");
  const dom = new JSDOM(html);
  try {
    const node = dom.window.document.querySelector(selector);
    if (!node) throw new Error("No semantic web node matched selector: " + selector);
    return assertObservationEnvelope({
      source: "web",
      step: node.getAttribute("data-subject-id") || selector,
      data: {
        subject_id: node.getAttribute("data-subject-id"),
        claim_type: node.getAttribute("data-claim-type") || "text",
        value: (node.textContent || "").trim(),
      },
      source_uri: sourceUri,
      retrieval_method: "dom-semantic-extraction",
    });
  } finally {
    dom.window.close();
  }
}

function pdfTextObservation({ text, subjectId, claimType = "text", sourceUri = "pdf://input" }) {
  if (typeof text !== "string" || text.trim() === "") throw new TypeError("text must be a non-empty string");
  if (typeof subjectId !== "string" || subjectId.trim() === "") throw new TypeError("subjectId must be a non-empty string");
  return assertObservationEnvelope({
    source: "pdf",
    step: subjectId,
    data: { subject_id: subjectId, claim_type: claimType, value: text.trim() },
    source_uri: sourceUri,
    retrieval_method: "pdf-text-observation",
  });
}

function githubObservation({ response, path, sourceUri = "github://input" }) {
  if (!response || typeof response !== "object" || Array.isArray(response)) throw new TypeError("response must be a JSON object");
  if (typeof response.subject_id !== "string" || response.subject_id.trim() === "") throw new TypeError("response.subject_id must be a non-empty string");
  return assertObservationEnvelope({
    source: "github",
    step: path || response.subject_id,
    data: {
      subject_id: response.subject_id,
      claim_type: response.claim_type || "text",
      value: response.value,
    },
    source_uri: sourceUri,
    retrieval_method: "github-api-observation",
  });
}

const webAdapter = defineAdapter({ id: "web-dom", version: "0.1.0", acquire: webObservation });
const pdfAdapter = defineAdapter({ id: "pdf-text", version: "0.1.0", acquire: pdfTextObservation });
const githubAdapter = defineAdapter({ id: "github-api", version: "0.1.0", acquire: githubObservation });

module.exports = { webAdapter, pdfAdapter, githubAdapter, webObservation, pdfTextObservation, githubObservation };
