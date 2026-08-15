module.exports = {
  forbidden: [
    { name: "no-circular-imports", severity: "error", from: {}, to: { circular: true } },
    { name: "core-cannot-import-contexts", severity: "error", from: { path: "^core/" }, to: { path: "^contexts/" } },
    { name: "task-management-cannot-import-ai-planning-implementation", severity: "error", from: { path: "^contexts/task-management/(domain|features)/" }, to: { path: "^contexts/ai-planning/(domain|features)/" } },
    { name: "ai-planning-cannot-import-task-management-implementation", severity: "error", from: { path: "^contexts/ai-planning/(domain|features)/" }, to: { path: "^contexts/task-management/(domain|features)/" } }
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" }
  }
};
