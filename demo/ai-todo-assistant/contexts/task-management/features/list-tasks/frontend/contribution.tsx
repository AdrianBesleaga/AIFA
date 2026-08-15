import AddRounded from "@mui/icons-material/AddRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import TimelapseRounded from "@mui/icons-material/TimelapseRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import {
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "../../../contracts/v1/task-taxonomy.js";
import type {
  ShellModel,
  TaskListModel,
  TaskView,
} from "../../../../../core/frontend/app-model.js";
import type {
  AnySlotContribution,
  SlotContribution,
} from "../../../../../core/frontend/slots/slot-registry.js";
import { AppSurface, SlotName } from "../../../../../core/shared/architecture-enums.js";
import { Slot } from "../../../../../core/frontend/slots/Slot.js";
import { TaskWorkspaceProvider, useTaskWorkspace } from "./controller.js";
import { visualTokens } from "../../../../../core/frontend/theme.js";

type TaskWorkspaceViewModel = ShellModel & TaskListModel;

function WorkspaceError({ message }: { message: string }) {
  return message ? <Alert severity="error">{message}</Alert> : null;
}

const statusColumns = [
  { status: TaskStatus.Todo, label: "To do", color: "#6c7480", tint: "#f0f1f3" },
  { status: TaskStatus.InProgress, label: "In progress", color: visualTokens.purple, tint: visualTokens.purpleTint },
  { status: TaskStatus.Completed, label: "Completed", color: visualTokens.green, tint: visualTokens.greenTint },
] as const;

const categoryColors: Record<string, { background: string; color: string }> = {
  Work: { background: visualTokens.purpleTint, color: visualTokens.purple },
  Personal: { background: visualTokens.orangeTint, color: "#b85d1d" },
  Sport: { background: visualTokens.sportTint, color: "#13775a" },
  Shopping: { background: visualTokens.shoppingTint, color: "#9b3fa0" },
  Other: { background: "#edf0f3", color: "#5f6875" },
};

function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" gap={compact ? 0.65 : 1.15}>
      <Box
        sx={{
          width: compact ? 24 : 36,
          height: compact ? 24 : 36,
          borderRadius: compact ? "8px" : "11px",
          display: "grid",
          placeItems: "center",
          bgcolor: inverse ? "secondary.main" : "primary.main",
          color: inverse ? "#171923" : "white",
          transform: "rotate(-4deg)",
        }}
      >
        <BoltRounded sx={{ fontSize: compact ? 14 : 20 }} />
      </Box>
      <Typography
        fontWeight={900}
        fontSize={compact ? "0.72rem" : "1.05rem"}
        letterSpacing="-0.04em"
        color={inverse ? "white" : "text.primary"}
      >
        focusly
      </Typography>
    </Stack>
  );
}

function AppHeader({ model }: { model: ShellModel }) {
  if (model.activeSurface === AppSurface.Landing) {
    return (
      <Stack direction="row" alignItems="center" width="100%">
        <Brand />
        <Stack direction="row" gap={4} sx={{ ml: 7, display: { xs: "none", md: "flex" } }}>
          {[
            ["Product", "product"],
            ["How it works", "how-it-works"],
            ["Why Focusly", "why-focusly"],
          ].map(([label, target]) => (
            <Button
              key={target}
              size="small"
              color="inherit"
              onClick={() =>
                document.getElementById(target)?.scrollIntoView({ behavior: "smooth" })
              }
              sx={{ color: "text.secondary", px: 0.5, minWidth: 0 }}
            >
              {label}
            </Button>
          ))}
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Button
          color="inherit"
          sx={{ display: { xs: "none", sm: "inline-flex" }, mr: 1 }}
          onClick={() => void model.signIn()}
        >
          Sign in
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForwardRounded />}
          onClick={() => void model.signIn()}
        >
          Open workspace
        </Button>
      </Stack>
    );
  }
  return (
    <Stack direction="row" alignItems="center" width="100%" gap={1.5}>
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          My workspace
        </Typography>
        <Typography fontWeight={850} lineHeight={1.1}>
          {model.activeSurface === AppSurface.Settings
            ? "AI connections"
            : model.activeSurface === AppSurface.Tasks
              ? "My tasks"
              : model.activeSurface === AppSurface.Planner
                ? "AI planner"
                : "Task overview"}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Stack
        direction="row"
        gap={0.8}
        alignItems="center"
        sx={{
          display: { xs: "none", sm: "flex" },
          px: 1.5,
          py: 0.8,
          borderRadius: 2,
          bgcolor: "#f6f5f1",
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#28a57a" }} />
        <Typography variant="caption" color="text.secondary" fontWeight={750}>
          AI assistant ready
        </Typography>
      </Stack>
      <Avatar sx={{ width: 38, height: 38, bgcolor: "#171923", fontSize: 14, fontWeight: 800 }}>
        AW
      </Avatar>
      <IconButton size="small" aria-label="Open account menu">
        <KeyboardArrowDownRounded />
      </IconButton>
    </Stack>
  );
}

function MiniTask({
  title,
  category,
  accent,
}: {
  title: string;
  category: string;
  accent: string;
}) {
  return (
    <Box
      sx={{
        bgcolor: "white",
        border: "1px solid rgba(23,25,35,.08)",
        borderRadius: 1,
        p: 1.25,
        boxShadow: "0 8px 24px rgba(27,29,40,.06)",
      }}
    >
      <Typography fontSize={8} fontWeight={800} lineHeight={1.3}>
        {title}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.25 }}>
        <Box sx={{ bgcolor: accent, borderRadius: 8, px: 0.8, py: 0.25 }}>
          <Typography fontSize={6.5} fontWeight={800}>
            {category}
          </Typography>
        </Box>
        <Avatar sx={{ width: 18, height: 18, bgcolor: "#171923", fontSize: 7 }}>AW</Avatar>
      </Stack>
    </Box>
  );
}

function ProductPreview() {
  const columns = [
    {
      label: "To do",
      count: 3,
      items: [
        ["Build launch checklist", "Work", "#eeecff"],
        ["Book Friday dinner", "Personal", "#fff0e6"],
      ],
    },
    {
      label: "In progress",
      count: 2,
      items: [
        ["Shape product narrative", "Work", "#d9ff57"],
        ["Morning run · 5 km", "Sport", "#e5f7f0"],
      ],
    },
    { label: "Completed", count: 8, items: [["Review weekly goals", "Personal", "#e4f6ef"]] },
  ];
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        borderRadius: { xs: 2, md: 2.5 },
        border: "1px solid rgba(23,25,35,.12)",
        bgcolor: "#eeeee9",
        p: { xs: 1.25, sm: 2 },
        boxShadow: "0 35px 80px rgba(39, 34, 71, .18)",
        transform: { md: "rotate(1.5deg)" },
      }}
    >
      <Stack direction="row" gap={1.4} alignItems="center" sx={{ px: 1, pb: 1.5 }}>
        <Box sx={{ display: "flex", gap: 0.6 }}>
          {["#ff6b6b", "#ffd43b", "#51cf66"].map((color) => (
            <Box key={color} sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
          ))}
        </Box>
        <Box
          sx={{
            height: 20,
            flex: 1,
            maxWidth: 190,
            bgcolor: "rgba(255,255,255,.75)",
            borderRadius: 8,
          }}
        />
      </Stack>
      <Stack direction="row" gap={1.5}>
        <Box
          sx={{
            width: 112,
            bgcolor: "#171923",
            borderRadius: 1.25,
            p: 1.4,
            display: { xs: "none", sm: "block" },
          }}
        >
          <Brand inverse compact />
          <Stack gap={1} sx={{ mt: 3 }}>
            {["Overview", "My tasks", "AI planner"].map((item, index) => (
              <Box
                key={item}
                sx={{
                  px: 1,
                  py: 0.7,
                  borderRadius: 0.75,
                  bgcolor: index === 0 ? "rgba(255,255,255,.12)" : "transparent",
                }}
              >
                <Typography
                  fontSize={6.5}
                  color={index === 0 ? "white" : "#9599a5"}
                  fontWeight={700}
                >
                  {item}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.5 }}
          >
            <Box>
              <Typography fontSize={6.5} color="text.secondary" fontWeight={800}>
                GOOD MORNING, ADRIAN
              </Typography>
              <Typography fontSize={11} fontWeight={900} letterSpacing="-.04em">
                Make today count.
              </Typography>
            </Box>
            <Box sx={{ width: 70, height: 24, borderRadius: 1.3, bgcolor: "primary.main" }} />
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {columns.map((column) => (
              <Box
                key={column.label}
                sx={{ minWidth: 0, bgcolor: "rgba(255,255,255,.48)", borderRadius: 1, p: 1 }}
              >
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography fontSize={6.5} fontWeight={900}>
                    {column.label}
                  </Typography>
                  <Typography fontSize={6.5} color="text.secondary">
                    {column.count}
                  </Typography>
                </Stack>
                <Stack gap={0.8}>
                  {column.items.map(([title, category, accent]) => (
                    <MiniTask key={title} title={title} category={category} accent={accent} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
      <Box
        sx={{
          position: "absolute",
          right: { xs: -8, md: -24 },
          top: { xs: -18, md: -28 },
          bgcolor: "secondary.main",
          borderRadius: 1.5,
          px: 2,
          py: 1.2,
          transform: "rotate(6deg)",
          boxShadow: "0 14px 30px rgba(52,62,19,.18)",
        }}
      >
        <Stack direction="row" gap={0.8} alignItems="center">
          <AutoAwesomeRounded sx={{ fontSize: 16 }} />
          <Typography fontSize={8.5} fontWeight={900}>
            AI plan ready
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

function LandingPage({ model }: { model: ShellModel }) {
  if (model.activeSurface !== AppSurface.Landing) return null;
  return (
    <Box>
      <Box
        id="product"
        sx={{
          position: "relative",
          overflow: "hidden",
          px: { xs: 2.5, sm: 4 },
          pt: { xs: 8, md: 11 },
          pb: { xs: 9, md: 14 },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            bgcolor: "#dfdaff",
            opacity: 0.65,
            top: -230,
            left: "42%",
          }}
        />
        <Box
          sx={{
            maxWidth: 1240,
            mx: "auto",
            position: "relative",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.05fr .95fr" },
            gap: { xs: 8, md: 8 },
            alignItems: "center",
          }}
        >
          <Box>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 3 }}>
              <Box sx={{ width: 28, height: 1, bgcolor: "primary.main" }} />
              <Typography
                variant="overline"
                color="primary.main"
                fontWeight={900}
                letterSpacing=".12em"
              >
                A calmer way to get things done
              </Typography>
            </Stack>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "3.3rem", sm: "4.6rem", lg: "5.5rem" },
                lineHeight: 0.95,
                letterSpacing: "-.065em",
                fontWeight: 900,
                maxWidth: 680,
              }}
            >
              Your day, finally
              <br />
              in{" "}
              <Box component="span" sx={{ color: "primary.main", whiteSpace: "nowrap" }}>
                clear focus.
              </Box>
            </Typography>
            <Typography
              color="text.secondary"
              sx={{
                fontSize: { xs: "1.05rem", md: "1.2rem" },
                lineHeight: 1.65,
                maxWidth: 560,
                mt: 3,
              }}
            >
              Turn scattered thoughts into an actionable plan. Focusly combines a beautiful task
              workspace with an AI copilot that helps you find the next right move.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 4 }}>
              <Button
                size="large"
                variant="contained"
                endIcon={<ArrowForwardRounded />}
                onClick={() => void model.signIn()}
                sx={{ py: 1.5 }}
              >
                Start focusing — it’s free
              </Button>
              <Button
                size="large"
                color="inherit"
                onClick={() =>
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                }
                sx={{ py: 1.5 }}
              >
                See how it works
              </Button>
            </Stack>
            <Stack
              direction="row"
              gap={2.5}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mt: 4, color: "text.secondary" }}
            >
              {["No credit card", "Set up in 30 seconds", "Local AI ready"].map((text) => (
                <Stack key={text} direction="row" gap={0.7} alignItems="center">
                  <CheckCircleRounded sx={{ fontSize: 17, color: "#168260" }} />
                  <Typography variant="caption" fontWeight={700}>
                    {text}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
          <ProductPreview />
        </Box>
      </Box>
      <Box
        id="how-it-works"
        sx={{ bgcolor: "#171923", color: "white", px: { xs: 2.5, sm: 4 }, py: { xs: 8, md: 11 } }}
      >
        <Box sx={{ maxWidth: 1240, mx: "auto" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            gap={2}
            sx={{ mb: 6 }}
          >
            <Box>
              <Typography variant="overline" color="secondary.main" fontWeight={900}>
                DESIGNED FOR MOMENTUM
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  mt: 1,
                  fontWeight: 900,
                  letterSpacing: "-.05em",
                  fontSize: { xs: "2.5rem", md: "3.6rem" },
                }}
              >
                Less organizing.
                <br />
                More moving.
              </Typography>
            </Box>
            <Typography
              sx={{
                color: "#aeb2bd",
                maxWidth: 430,
                alignSelf: { md: "flex-end" },
                lineHeight: 1.7,
              }}
            >
              Every screen is built to reduce friction—from capturing a thought to finishing the
              work that matters.
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {[
              {
                n: "01",
                icon: <AutoAwesomeRounded />,
                title: "Describe the outcome",
                text: "Tell the AI what you want to achieve in plain language.",
              },
              {
                n: "02",
                icon: <GridViewRounded />,
                title: "Shape the plan",
                text: "Review categorized suggestions and add the useful ones in a click.",
              },
              {
                n: "03",
                icon: <TrendingUpRounded />,
                title: "Keep momentum",
                text: "Move work across a clear board and see progress build naturally.",
              },
            ].map((item, index) => (
              <Box
                key={item.n}
                sx={{
                  p: { xs: 3, md: 4 },
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 3,
                  bgcolor: index === 1 ? "rgba(85,70,255,.22)" : "rgba(255,255,255,.035)",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2,
                      bgcolor: index === 1 ? "secondary.main" : "rgba(255,255,255,.1)",
                      color: index === 1 ? "#171923" : "white",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography color="#747986" fontWeight={900}>
                    {item.n}
                  </Typography>
                </Stack>
                <Typography variant="h5" fontWeight={850} sx={{ mt: 4 }}>
                  {item.title}
                </Typography>
                <Typography sx={{ color: "#aeb2bd", mt: 1.5, lineHeight: 1.65 }}>
                  {item.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <Box id="why-focusly" sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 8, md: 11 } }}>
        <Paper
          elevation={0}
          sx={{
            maxWidth: 1240,
            mx: "auto",
            p: { xs: 4, md: 7 },
            borderRadius: 4,
            bgcolor: "secondary.main",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              width: 250,
              height: 250,
              border: "45px solid rgba(23,25,35,.08)",
              borderRadius: "50%",
              right: -70,
              top: -90,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              letterSpacing: "-.055em",
              fontSize: { xs: "2.6rem", md: "4rem" },
              maxWidth: 720,
              position: "relative",
            }}
          >
            Make room for the work that matters.
          </Typography>
          <Button
            variant="contained"
            onClick={() => void model.signIn()}
            endIcon={<ArrowForwardRounded />}
            sx={{
              mt: 3,
              bgcolor: "#171923",
              color: "white",
              py: 1.4,
              "&:hover": { bgcolor: "#2b2e3b" },
            }}
          >
            Open your workspace
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

function TaskCard({ model, task }: { model: TaskListModel; task: TaskView }) {
  const categoryColor = categoryColors[task.category] ?? categoryColors.Other;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2.5,
        borderColor: "rgba(23,25,35,.09)",
        boxShadow: "0 8px 24px rgba(27,29,40,.035)",
        transition: "transform .2s ease, box-shadow .2s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 14px 30px rgba(27,29,40,.08)" },
      }}
    >
      <Stack gap={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Typography fontWeight={800} lineHeight={1.4}>
            {task.title}
          </Typography>
          <Box
            sx={{
              width: 8,
              height: 8,
              mt: 0.7,
              borderRadius: "50%",
              bgcolor:
                task.priority === TaskPriority.High
                  ? "#ef5b5b"
                  : task.priority === "Medium"
                    ? "#f3ad36"
                    : "#7a8492",
              flexShrink: 0,
            }}
          />
        </Stack>
        <Stack direction="row" gap={0.75} alignItems="center">
          <Chip
            label={task.category}
            size="small"
            sx={{
              bgcolor: categoryColor.background,
              color: categoryColor.color,
              height: 24,
              fontSize: 11,
            }}
          />
          <Typography variant="caption" color="text.secondary" fontWeight={650}>
            {task.priority} priority
          </Typography>
        </Stack>
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1.25 }}>
          <Slot name={SlotName.TaskRowActions} model={{ task }} />
        </Box>
      </Stack>
    </Paper>
  );
}

function TaskList({ model }: { model: TaskListModel }) {
  const visibleTasks = model.categoryFilter
    ? model.tasks.filter((task) => task.category === model.categoryFilter)
    : model.tasks;
  return (
    <Stack gap={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={1.5}
        alignItems={{ sm: "center" }}
      >
        <Box>
          <Typography variant="h5" fontWeight={900} letterSpacing="-.035em">
            Your task flow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Move with clarity, one task at a time.
          </Typography>
        </Box>
        <Stack
          direction="row"
          gap={0.75}
          sx={{ overflowX: "auto", pb: 0.5, maxWidth: { sm: "58%" } }}
        >
          <Chip
            label="All"
            size="small"
            clickable
            color={model.categoryFilter === "" ? "primary" : "default"}
            variant={model.categoryFilter === "" ? "filled" : "outlined"}
            onClick={() => model.setCategoryFilter("")}
            sx={{ flexShrink: 0, height: 28, "& .MuiChip-label": { px: 1.25 } }}
          />
          {Object.values(TaskCategory).map((category) => (
            <Chip
              key={category}
              label={category}
              size="small"
              clickable
              color={model.categoryFilter === category ? "primary" : "default"}
              variant={model.categoryFilter === category ? "filled" : "outlined"}
              onClick={() => model.setCategoryFilter(category)}
              sx={{ flexShrink: 0, height: 28, "& .MuiChip-label": { px: 1.25 } }}
            />
          ))}
        </Stack>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(3, minmax(280px, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          overflowX: { xs: "auto", lg: "visible" },
          pb: 1,
        }}
      >
        {statusColumns.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.status);
          return (
            <Box
              key={column.status}
              sx={{ minWidth: 0, bgcolor: "#eeede8", borderRadius: 3, p: 1.5 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 0.5, mb: 1.5 }}
              >
                <Stack direction="row" alignItems="center" gap={0.85}>
                  <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: column.color }} />
                  <Typography fontWeight={850}>{column.label}</Typography>
                  <Box
                    sx={{
                      px: 0.8,
                      py: 0.15,
                      borderRadius: 5,
                      bgcolor: column.tint,
                      color: column.color,
                    }}
                  >
                    <Typography fontSize={11} fontWeight={900}>
                      {columnTasks.length}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  size="small"
                  aria-label={`Add to ${column.label}`}
                  onClick={() =>
                    document
                      .getElementById("quick-capture")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                >
                  <AddRounded fontSize="small" />
                </IconButton>
              </Stack>
              <Stack gap={1.25}>
                {columnTasks.length ? (
                  columnTasks.map((task) => <TaskCard key={task.id} model={model} task={task} />)
                ) : (
                  <Box
                    sx={{
                      minHeight: 132,
                      display: "grid",
                      placeItems: "center",
                      border: "1px dashed rgba(23,25,35,.16)",
                      borderRadius: 2.5,
                      px: 2,
                      textAlign: "center",
                    }}
                  >
                    <Box>
                      <TaskAltRounded sx={{ color: "#a8acb4", mb: 0.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        This lane is clear
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}

function Navigation({ model }: { model: ShellModel }) {
  return (
    <Stack sx={{ bgcolor: "#171923", color: "white", p: 2, pb: 1 }}>
      <Box sx={{ px: 1, pt: 0.5, mb: 4 }}>
        <Brand inverse />
      </Box>
      <Typography
        variant="overline"
        sx={{ px: 1.25, color: "#737885", fontWeight: 850, fontSize: 10 }}
      >
        WORKSPACE
      </Typography>
      <List disablePadding sx={{ mt: 1 }}>
        <ListItemButton
          selected={model.activeSurface === AppSurface.Dashboard}
          onClick={() => model.setActiveSurface(AppSurface.Dashboard)}
          sx={{
            borderRadius: 2,
            py: 1.1,
            color: "#aeb2bd",
            "&.Mui-selected": { bgcolor: "rgba(255,255,255,.1)", color: "white" },
            "&.Mui-selected:hover": { bgcolor: "rgba(255,255,255,.13)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
            <DashboardRounded />
          </ListItemIcon>
          <ListItemText primary="Overview" primaryTypographyProps={{ fontWeight: 750 }} />
        </ListItemButton>
        <ListItemButton
          selected={model.activeSurface === AppSurface.Tasks}
          onClick={() => model.setActiveSurface(AppSurface.Tasks)}
          sx={{
            borderRadius: 2,
            py: 1.1,
            color: "#aeb2bd",
            "&.Mui-selected": { bgcolor: "rgba(255,255,255,.1)", color: "white" },
            "&.Mui-selected:hover": { bgcolor: "rgba(255,255,255,.13)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
            <TaskAltRounded />
          </ListItemIcon>
          <ListItemText primary="My tasks" primaryTypographyProps={{ fontWeight: 700 }} />
        </ListItemButton>
        <ListItemButton
          selected={model.activeSurface === AppSurface.Planner}
          onClick={() => model.setActiveSurface(AppSurface.Planner)}
          sx={{
            borderRadius: 2,
            py: 1.1,
            color: "#aeb2bd",
            "&.Mui-selected": { bgcolor: "rgba(255,255,255,.1)", color: "white" },
            "&.Mui-selected:hover": { bgcolor: "rgba(255,255,255,.13)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
            <AutoAwesomeRounded />
          </ListItemIcon>
          <ListItemText primary="AI planner" primaryTypographyProps={{ fontWeight: 700 }} />
        </ListItemButton>
      </List>
      <Box sx={{ flex: 1 }} />
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2.5,
          bgcolor: "rgba(217,255,87,.09)",
          border: "1px solid rgba(217,255,87,.16)",
          mb: 1,
        }}
      >
        <Stack direction="row" gap={1} alignItems="center">
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1.5,
              display: "grid",
              placeItems: "center",
              bgcolor: "secondary.main",
              color: "#171923",
            }}
          >
            <BoltRounded fontSize="small" />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={800}>
              Weekly momentum
            </Typography>
            <Typography display="block" variant="caption" sx={{ color: "#8e94a1" }}>
              Keep the streak alive
            </Typography>
          </Box>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={72}
          sx={{
            mt: 1.5,
            height: 5,
            borderRadius: 5,
            bgcolor: "rgba(255,255,255,.1)",
            "& .MuiLinearProgress-bar": { bgcolor: "secondary.main" },
          }}
        />
      </Box>
      <Button
        color="inherit"
        startIcon={<ArrowForwardRounded sx={{ transform: "rotate(180deg)" }} />}
        onClick={() => model.setActiveSurface(AppSurface.Landing)}
        sx={{ color: "#8e94a1", justifyContent: "flex-start" }}
      >
        Back to home
      </Button>
    </Stack>
  );
}

function Metric({
  icon,
  value,
  label,
  accent,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.25, borderRadius: 2.5, borderColor: "rgba(23,25,35,.09)" }}
    >
      <Stack direction="row" alignItems="center" gap={1.5}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: accent,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={900} lineHeight={1}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function Dashboard({ model }: { model: TaskWorkspaceViewModel }) {
  if (model.activeSurface !== AppSurface.Dashboard) return null;
  const completed = model.tasks.filter((task) => task.status === TaskStatus.Completed).length;
  const active = model.tasks.filter((task) => task.status === TaskStatus.InProgress).length;
  const due = model.tasks.filter((task) => task.status === TaskStatus.Todo).length;
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(new Date())
    .toUpperCase();
  return (
    <Stack gap={3.5}>
      <WorkspaceError message={model.error} />
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "flex-end" }}
        gap={2}
      >
        <Box>
          <Typography
            variant="overline"
            color="primary.main"
            fontWeight={900}
            letterSpacing=".11em"
          >
            {today}
          </Typography>
          <Typography
            variant="h3"
            fontWeight={900}
            letterSpacing="-.05em"
            sx={{ fontSize: { xs: "2.3rem", md: "3rem" } }}
          >
            Make today count.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.7 }}>
            You’re closer than you think. Pick the next meaningful move.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={() =>
            document
              .getElementById("quick-capture")
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          sx={{ py: 1.25 }}
        >
          Create task
        </Button>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 1.5,
        }}
      >
        <Metric
          icon={<TaskAltRounded sx={{ color: "#5546ff" }} />}
          value={model.tasks.length}
          label="Total tasks"
          accent="#eeecff"
        />
        <Metric
          icon={<TimelapseRounded sx={{ color: "#b06c00" }} />}
          value={active}
          label="In progress"
          accent="#fff0d7"
        />
        <Metric
          icon={<CheckCircleRounded sx={{ color: "#168260" }} />}
          value={completed}
          label="Completed"
          accent="#e4f6ef"
        />
        <Metric
          icon={<CalendarMonthRounded sx={{ color: "#9b3fa0" }} />}
          value={due}
          label="Ready to start"
          accent="#f9eafa"
        />
      </Box>
      <Box id="ai-planner">
        <Slot name={SlotName.AssistantPanel} model={{}} />
      </Box>
      <Paper
        id="quick-capture"
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          bgcolor: "white",
          border: "1px solid rgba(23,25,35,.09)",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              bgcolor: "secondary.main",
              borderRadius: 1.5,
            }}
          >
            <AddRounded fontSize="small" />
          </Box>
          <Typography fontWeight={850}>Quick capture</Typography>
        </Stack>
        <Slot name={SlotName.TaskComposer} model={{}} />
      </Paper>
      <TaskList model={model} />
    </Stack>
  );
}

function TasksPage({ model }: { model: TaskWorkspaceViewModel }) {
  if (model.activeSurface !== AppSurface.Tasks) return null;
  return (
    <Stack gap={3.5}>
      <WorkspaceError message={model.error} />
      <Box>
        <Typography variant="overline" color="primary.main" fontWeight={900} letterSpacing=".11em">
          TASKS
        </Typography>
        <Typography
          variant="h3"
          fontWeight={900}
          letterSpacing="-.05em"
          sx={{ fontSize: { xs: "2.2rem", md: "2.8rem" } }}
        >
          Everything on your plate.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.7 }}>
          Capture, prioritize, and move work forward from one focused view.
        </Typography>
      </Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          bgcolor: "white",
          border: "1px solid rgba(23,25,35,.09)",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              bgcolor: "secondary.main",
              borderRadius: 1.5,
            }}
          >
            <AddRounded fontSize="small" />
          </Box>
          <Typography fontWeight={850}>Add something new</Typography>
        </Stack>
        <Slot name={SlotName.TaskComposer} model={{}} />
      </Paper>
      <TaskList model={model} />
    </Stack>
  );
}

function PlannerPage({ model }: { model: TaskWorkspaceViewModel }) {
  if (model.activeSurface !== AppSurface.Planner) return null;
  return (
    <Stack gap={3.5}>
      <WorkspaceError message={model.error} />
      <Box>
        <Typography variant="overline" color="primary.main" fontWeight={900} letterSpacing=".11em">
          AI PLANNER
        </Typography>
        <Typography
          variant="h3"
          fontWeight={900}
          letterSpacing="-.05em"
          sx={{ fontSize: { xs: "2.2rem", md: "2.8rem" } }}
        >
          Start with the outcome.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.7, maxWidth: 620 }}>
          Describe where you want to go. Focusly will turn it into practical, reviewable steps
          without adding anything until you approve it.
        </Typography>
      </Box>
      <Slot name={SlotName.AssistantPanel} model={{}} />
      <Box
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}
      >
        {[
          ["01", "Describe", "Share a goal in your own words."],
          ["02", "Review", "Refine the categorized suggestions."],
          ["03", "Act", "Add only the tasks that move you forward."],
        ].map(([number, title, text]) => (
          <Paper
            key={number}
            variant="outlined"
            sx={{ p: 2.5, borderRadius: 2.5, borderColor: "rgba(23,25,35,.09)" }}
          >
            <Typography variant="overline" color="primary.main" fontWeight={900}>
              {number}
            </Typography>
            <Typography fontWeight={850} sx={{ mt: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {text}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}

function TaskWorkspaceContentInner({ shell }: { shell: ShellModel }) {
  const model = { ...shell, ...useTaskWorkspace() };
  return (
    <>
      <Dashboard model={model} />
      <TasksPage model={model} />
      <PlannerPage model={model} />
    </>
  );
}
function TaskWorkspaceContent({ shell }: { shell: ShellModel }) {
  if (shell.activeSurface === AppSurface.Landing) return <LandingPage model={shell} />;
  if (!shell.signedIn) return null;
  return (
    <TaskWorkspaceProvider>
      <TaskWorkspaceContentInner shell={shell} />
    </TaskWorkspaceProvider>
  );
}

export const contribution: SlotContribution<SlotName.TaskList> = {
  slot: SlotName.TaskList,
  name: "task-list",
  render: (model) => <TaskList model={model} />,
};

export const contributions: AnySlotContribution[] = [
  {
    slot: SlotName.AppHeader,
    name: "workspace-header",
    order: 10,
    render: (model) => <AppHeader model={model} />,
  },
  {
    slot: SlotName.AppNavigation,
    name: "task-workspace-navigation",
    order: 10,
    render: (model) => <Navigation model={model} />,
  },
  {
    slot: SlotName.AppContent,
    name: "task-workspace-content",
    order: 10,
    render: (model) => <TaskWorkspaceContent shell={model} />,
  },
  {
    slot: SlotName.AppFooter,
    name: "task-workspace-footer",
    order: 10,
    render: (model) =>
      model.activeSurface === AppSurface.Landing ? (
        <Box
          component="footer"
          sx={{ px: 3, py: 4, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            gap={2}
            maxWidth={1240}
            mx="auto"
          >
            <Brand />
            <Typography variant="caption" color="text.secondary">
              © 2026 Focusly. Built on AIFA’s composable feature architecture.
            </Typography>
          </Stack>
        </Box>
      ) : null,
  },
];
