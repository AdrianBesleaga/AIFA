import ChevronLeft from "@mui/icons-material/ChevronLeft";
import Menu from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppSurface, SlotName } from "../shared/architecture-enums.js";
import type { ShellModel } from "./app-model.js";
import { LazySlot } from "./slots/LazySlot.js";
import { beginSignIn, completeSignIn, getAccessToken } from "./auth/oidc.js";
import { visualTokens } from "./theme.js";
import { useQueryClient } from "./query/react-query.js";

const drawerWidth = 248;

export function App() {
  const [activeSurface, setActiveSurface] = useState(AppSurface.Landing);
  const [signedIn, setSignedIn] = useState(import.meta.env.DEV || Boolean(getAccessToken()));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const queryClient = useQueryClient();
  const previousIdentityState = useRef(signedIn);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  useEffect(() => {
    if (import.meta.env.DEV) return;
    void completeSignIn().then((authenticated) => {
      setSignedIn(authenticated);
      if (authenticated) setActiveSurface(AppSurface.Dashboard);
    });
  }, []);
  useEffect(() => {
    if (previousIdentityState.current === signedIn) return;
    previousIdentityState.current = signedIn;
    queryClient.clear();
  }, [queryClient, signedIn]);
  const model = useMemo<ShellModel>(
    () => ({
      activeSurface,
      signedIn,
      signIn: async () => {
        if (import.meta.env.DEV) {
          setActiveSurface(AppSurface.Dashboard);
          return;
        }
        await beginSignIn();
      },
      setActiveSurface: (surface) => {
        setActiveSurface(surface);
        setMobileNavOpen(false);
      },
    }),
    [activeSurface, signedIn],
  );
  const navigation = <LazySlot name={SlotName.AppNavigation} model={model} />;
  const isLanding = activeSurface === AppSurface.Landing;
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", overflowX: "hidden" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: isLanding ? "rgba(17, 24, 39, 0.08)" : "divider",
          bgcolor: isLanding ? "rgba(247, 245, 239, 0.88)" : "rgba(255,255,255,0.9)",
          backdropFilter: "blur(18px)",
          zIndex: (value) => value.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 68, md: 76 },
            width: "100%",
            maxWidth: isLanding ? 1240 : "none",
            mx: "auto",
            px: { xs: 2, sm: 3 },
          }}
        >
          {!isLanding && !isDesktop && (
            <IconButton
              edge="start"
              onClick={() => setMobileNavOpen(true)}
              aria-label="open navigation"
            >
              <Menu />
            </IconButton>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <LazySlot name={SlotName.AppHeader} model={model} />
          </Box>
        </Toolbar>
      </AppBar>
      {!isLanding && (
        <Box component="nav" aria-label="Primary navigation">
          <Drawer
            variant="permanent"
            open={isDesktop}
            sx={{
              display: { xs: "none", md: "block" },
              "& .MuiDrawer-paper": {
                width: drawerWidth,
                boxSizing: "border-box",
                borderRight: 0,
                bgcolor: visualTokens.ink,
              },
            }}
          >
            <Toolbar sx={{ minHeight: "72px !important" }} />
            {navigation}
          </Drawer>
          <Drawer
            variant="temporary"
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { md: "none" },
              "& .MuiDrawer-paper": { width: drawerWidth, bgcolor: visualTokens.ink, color: "white" },
            }}
          >
            <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1, pr: 1 }}>
              <IconButton onClick={() => setMobileNavOpen(false)} aria-label="close navigation">
                <ChevronLeft />
              </IconButton>
            </Stack>
            {navigation}
          </Drawer>
        </Box>
      )}
      <Box
        component="main"
        sx={{
          ml: isLanding ? 0 : { md: `${drawerWidth}px` },
          pt: isLanding ? { xs: "68px", md: "76px" } : { xs: 10, md: 12 },
          px: isLanding ? 0 : { xs: 2, sm: 3, lg: 4 },
          pb: isLanding ? 0 : 4,
          maxWidth: isLanding ? "none" : { xl: "1680px" },
        }}
      >
        <LazySlot name={SlotName.AppContent} model={model} />
        <LazySlot name={SlotName.AppFooter} model={model} />
      </Box>
    </Box>
  );
}
