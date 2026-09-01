const { assertNonEmptyString } = require("./contracts");

const ADAPTER_CONTRACT_VERSION = 1;

function defineAdapter({ id, version = "0.1.0", acquire }) {
  assertNonEmptyString(id, "adapter.id");
  assertNonEmptyString(version, "adapter.version");
  if (typeof acquire !== "function") {
    throw new TypeError("adapter.acquire must be a function");
  }

  return Object.freeze({
    contract_version: ADAPTER_CONTRACT_VERSION,
    id,
    version,
    async acquire(input = {}) {
      return acquire(input);
    },
  });
}

function assertObservationEnvelope(observation) {
  if (!observation || typeof observation !== "object") {
    throw new TypeError("adapter observation must be an object");
  }
  assertNonEmptyString(observation.source, "observation.source");
  assertNonEmptyString(observation.step, "observation.step");
  if (!("data" in observation)) {
    throw new TypeError("observation.data is required");
  }
  return observation;
}

module.exports = { ADAPTER_CONTRACT_VERSION, defineAdapter, assertObservationEnvelope };
