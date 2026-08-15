const { readdirSync } = require("node:fs");
const { join } = require("node:path");

const contextsRoot = join(__dirname, "../../contexts");
const contexts = readdirSync(contextsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const contextIsolation = contexts.flatMap((source) =>
  contexts
    .filter((target) => target !== source)
    .map((target) => ({
      name: `${source}-cannot-import-${target}-implementation`,
      severity: "error",
      from: { path: `^contexts/${source}/` },
      to: { path: `^contexts/${target}/(domain|features|infrastructure)/` },
    })),
);
const featureIsolation = contexts.flatMap((context) => {
  const root = join(contextsRoot, context, "features");
  let features = [];
  try {
    features = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {}
  return features.flatMap((source) =>
    features
      .filter((target) => target !== source)
      .map((target) => ({
        name: `${context}-${source}-cannot-import-${target}`,
        severity: "error",
        from: { path: `^contexts/${context}/features/${source}/` },
        to: { path: `^contexts/${context}/features/${target}/` },
      })),
  );
});

module.exports = {
  forbidden: [
    { name: "no-circular-imports", severity: "error", from: {}, to: { circular: true } },
    {
      name: "core-cannot-import-contexts",
      severity: "error",
      from: { path: "^core/" },
      to: { path: "^contexts/" },
    },
    {
      name: "features-cannot-import-infrastructure",
      severity: "error",
      from: { path: "^contexts/[^/]+/features/" },
      to: { path: "^contexts/[^/]+/infrastructure/" },
    },
    {
      name: "product-code-cannot-import-core-backend",
      severity: "error",
      from: { path: "^contexts/[^/]+/(domain|features)/" },
      to: { path: "^core/backend/" },
    },
    {
      name: "features-cannot-import-node-runtime",
      severity: "error",
      from: { path: "^contexts/[^/]+/features/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "features-cannot-import-infrastructure-packages",
      severity: "error",
      from: { path: "^contexts/[^/]+/features/" },
      to: {
        path: "^(?:node_modules/)?(?:mongodb|@modelcontextprotocol/sdk|jose|dotenv)(?:/|$)",
      },
    },
    {
      name: "domain-cannot-import-features-or-infrastructure",
      severity: "error",
      from: { path: "^contexts/[^/]+/domain/" },
      to: { path: "^contexts/[^/]+/(features|infrastructure)/" },
    },
    {
      name: "infrastructure-cannot-import-features",
      severity: "error",
      from: { path: "^contexts/[^/]+/infrastructure/" },
      to: { path: "^contexts/[^/]+/features/" },
    },
    ...contextIsolation,
    ...featureIsolation,
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
