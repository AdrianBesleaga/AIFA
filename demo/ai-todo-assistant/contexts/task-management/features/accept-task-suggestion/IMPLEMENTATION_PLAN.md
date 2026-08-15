# Accept Task Suggestion

This feature consumes the published AI Planning suggestion contract and turns one explicitly
reviewed suggestion into a tenant-bound task. AI Planning supplies the suggestion to the typed
`TaskSuggestionActions` slot; it does not know which feature implements acceptance or which route
is invoked.

The mutation uses the standard task persistence, clock, ID, and domain-event capabilities. It
emits `TaskCreatedV1`, invalidates the task collection after a local success, and preserves the
browser command ID across unknown transport outcomes.
