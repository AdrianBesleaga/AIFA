export function defineFeature(definition) {
  const requiredFields = ["name", "description", "input", "output", "capabilities", "execute"];

  for (const field of requiredFields) {
    if (!(field in definition)) {
      throw new Error(`Feature is missing required field: ${field}`);
    }
  }

  if (!Array.isArray(definition.capabilities)) {
    throw new Error("Feature capabilities must be an array");
  }

  if (typeof definition.execute !== "function") {
    throw new Error("Feature execute must be a function");
  }

  return Object.freeze({ ...definition });
}

export function ok(value) {
  return {
    ok: true,
    value,
  };
}

export function fail(code, message, details = {}) {
  return {
    ok: false,
    error: {
      code,
      message,
      details,
    },
  };
}

