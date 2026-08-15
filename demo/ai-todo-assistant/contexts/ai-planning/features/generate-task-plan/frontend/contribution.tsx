import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import {
  TaskCategory,
  TaskPriority,
} from "../../../../task-management/contracts/v1/task-taxonomy.js";
import type { TaskPlanSuggestionV1 } from "../../../../../core/shared/generated/contracts.js";
import type { SlotContribution } from "../../../../../core/frontend/slots/slot-registry.js";
import { SlotName } from "../../../../../core/shared/architecture-enums.js";
import { useAcceptTaskSuggestion, useGenerateTaskPlan } from "./use-generate-task-plan.js";

function Planner() {
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState(TaskCategory.Work);
  const [priority, setPriority] = useState(TaskPriority.Medium);
  const [suggestions, setSuggestions] = useState<TaskPlanSuggestionV1[]>([]);
  const generatePlan = useGenerateTaskPlan();
  const acceptSuggestion = useAcceptTaskSuggestion();
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#24213a",
        color: "white",
        borderRadius: 3,
        p: { xs: 2.5, md: 3.5 },
      }}
    >
      {(generatePlan.error || acceptSuggestion.error) && (
        <Alert severity="error" sx={{ mb: 2, position: "relative" }}>
          {(generatePlan.error ?? acceptSuggestion.error)?.message}
        </Alert>
      )}
      <Box
        sx={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          bgcolor: "rgba(85,70,255,.45)",
          filter: "blur(2px)",
          right: -110,
          top: -150,
        }}
      />
      <Stack
        direction={{ xs: "column", lg: "row" }}
        gap={3}
        alignItems={{ lg: "center" }}
        position="relative"
      >
        <Box sx={{ width: { lg: 265 }, flexShrink: 0 }}>
          <Stack direction="row" gap={1} alignItems="center">
            <Box
              sx={{
                width: 34,
                height: 34,
                bgcolor: "secondary.main",
                color: "#171923",
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
              }}
            >
              <AutoAwesomeRounded fontSize="small" />
            </Box>
            <Typography variant="overline" color="secondary.main" fontWeight={900}>
              AI COPILOT
            </Typography>
          </Stack>
          <Typography variant="h5" fontWeight={900} letterSpacing="-.035em" sx={{ mt: 1.5 }}>
            Turn a goal into a clear next move.
          </Typography>
          <Typography variant="body2" sx={{ color: "#b8b6c8", mt: 1 }}>
            Describe the outcome. Your assistant will shape the steps.
          </Typography>
        </Box>
        <Stack gap={1.25} sx={{ flex: 1, minWidth: 0 }}>
          <TextField
            fullWidth
            placeholder="What do you want to accomplish?"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            inputProps={{ "aria-label": "Goal for AI planning" }}
            sx={{ "& .MuiOutlinedInput-root": { bgcolor: "white", borderRadius: 2 } }}
          />
          <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
            <Select
              inputProps={{ "aria-label": "Suggested task category" }}
              value={category}
              onChange={(event) => setCategory(event.target.value as TaskCategory)}
              size="small"
              sx={{
                minWidth: 140,
                bgcolor: "rgba(255,255,255,.1)",
                color: "white",
                "& .MuiSvgIcon-root": { color: "white" },
                "& fieldset": { borderColor: "rgba(255,255,255,.16)" },
              }}
            >
              {Object.values(TaskCategory).map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
            <Select
              inputProps={{ "aria-label": "Suggested task priority" }}
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              size="small"
              sx={{
                minWidth: 140,
                bgcolor: "rgba(255,255,255,.1)",
                color: "white",
                "& .MuiSvgIcon-root": { color: "white" },
                "& fieldset": { borderColor: "rgba(255,255,255,.16)" },
              }}
            >
              {Object.values(TaskPriority).map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              endIcon={<ArrowForwardRounded />}
              disabled={!goal.trim() || generatePlan.isPending}
              onClick={() =>
                void generatePlan
                  .mutate({ goal, category, priority })
                  .then(setSuggestions)
                  .catch(() => undefined)
              }
              sx={{
                bgcolor: "secondary.main",
                color: "#171923",
                "&:hover": { bgcolor: "#c7ed46" },
              }}
            >
              {generatePlan.isPending ? "Thinking…" : "Build my plan"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
      {suggestions.length > 0 && (
        <Stack gap={1} sx={{ mt: 3, position: "relative" }}>
          {suggestions.map((suggestion) => (
            <Paper
              key={suggestion.title}
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: "rgba(255,255,255,.08)",
                color: "white",
                border: "1px solid rgba(255,255,255,.1)",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ sm: "center" }}
                gap={1.25}
              >
                <BoltRounded sx={{ color: "secondary.main" }} />
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={800}>{suggestion.title}</Typography>
                  <Typography variant="caption" sx={{ color: "#b8b6c8" }}>
                    {suggestion.rationale}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={suggestion.category}
                  sx={{ bgcolor: "rgba(255,255,255,.12)", color: "white" }}
                />
                <Button
                  size="small"
                  variant="contained"
                  disabled={acceptSuggestion.isPending}
                  onClick={() => void acceptSuggestion.mutate(suggestion)}
                  sx={{ bgcolor: "white", color: "#171923" }}
                >
                  Add task
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export const contribution: SlotContribution<SlotName.AssistantPanel> = {
  slot: SlotName.AssistantPanel,
  name: "task-plan-review",
  order: 10,
  render: () => <Planner />,
};
