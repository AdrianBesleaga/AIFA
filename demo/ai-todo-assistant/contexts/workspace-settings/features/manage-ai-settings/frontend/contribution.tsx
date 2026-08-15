import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import HubRounded from "@mui/icons-material/HubRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import {
  Card,
  CardContent,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import type { ShellModel } from "../../../../../core/frontend/app-model.js";
import { Slot } from "../../../../../core/frontend/slots/Slot.js";
import type {
  AnySlotContribution,
  SlotContribution,
} from "../../../../../core/frontend/slots/slot-registry.js";
import { AppSurface, SlotName } from "../../../../../core/shared/architecture-enums.js";

function Settings({ model: _model }: { model: ShellModel }) {
  return (
    <Stack direction={{ xs: "column", lg: "row" }} gap={3} alignItems="flex-start">
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 720 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack gap={3}>
            <Stack direction="row" gap={1.5} alignItems="center">
              <SmartToyRounded color="primary" />
              <BoxTitle
                title="Runtime-managed AI connection"
                description="The active provider and model are configured on the server by an operator."
              />
            </Stack>
            <Divider />
            <Typography color="text.secondary">
              Browser-side provider URLs and credentials are intentionally disabled. Configure
              OLLAMA_BASE_URL and OLLAMA_MODEL on the API runtime, then use readiness checks and
              server telemetry to verify the connection.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 360, bgcolor: "#fbfcff" }}>
        <CardContent>
          <Stack gap={2}>
            <Stack direction="row" gap={1} alignItems="center">
              <HubRounded color="primary" />
              <Typography fontWeight={800}>Connection status</Typography>
            </Stack>
            <Stack direction="row" gap={1} alignItems="center">
              <CheckCircleRounded color="success" fontSize="small" />
              <Typography variant="body2">
                Provider settings are enforced by the runtime
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Provider credentials and connection endpoints never enter browser storage.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
function BoxTitle({ title, description }: { title: string; description: string }) {
  return (
    <Stack gap={0.25}>
      <Typography variant="h6" fontWeight={800}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  );
}
function Navigation({ model }: { model: ShellModel }) {
  return (
    <List disablePadding sx={{ px: 2, pb: 2, bgcolor: "#171923" }}>
      <ListItemButton
        selected={model.activeSurface === AppSurface.Settings}
        onClick={() => model.setActiveSurface(AppSurface.Settings)}
        sx={{
          borderRadius: 2,
          py: 1.1,
          color: "#aeb2bd",
          "&.Mui-selected": { bgcolor: "rgba(255,255,255,.1)", color: "white" },
          "&.Mui-selected:hover": { bgcolor: "rgba(255,255,255,.13)" },
        }}
      >
        <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
          <SettingsRounded />
        </ListItemIcon>
        <ListItemText primary="AI connections" primaryTypographyProps={{ fontWeight: 700 }} />
      </ListItemButton>
    </List>
  );
}
function SettingsPage({ model }: { model: ShellModel }) {
  if (model.activeSurface !== AppSurface.Settings) return null;
  return (
    <Stack gap={3}>
      <BoxTitle
        title="AI connections"
        description="Choose the assistant and local or remote connection your workspace uses."
      />
      <Slot name={SlotName.SettingsPanel} model={model} />
    </Stack>
  );
}

export const contribution: SlotContribution<SlotName.SettingsPanel> = {
  slot: SlotName.SettingsPanel,
  name: "ai-settings-panel",
  order: 10,
  render: (model) => <Settings model={model} />,
};
export const contributions: AnySlotContribution[] = [
  {
    slot: SlotName.AppNavigation,
    name: "ai-settings-navigation",
    order: 20,
    render: (model) => <Navigation model={model} />,
  },
  {
    slot: SlotName.AppContent,
    name: "ai-settings-page",
    order: 20,
    render: (model) => <SettingsPage model={model} />,
  },
];
