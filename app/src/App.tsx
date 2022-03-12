import { ThemeProvider } from "@emotion/react";
import {
  Backdrop,
  CircularProgress,
  Container,
  createTheme,
  CssBaseline,
  responsiveFontSizes,
  Typography,
} from "@mui/material";
import { FC, useState } from "react";
import Search from "./components/Search";
import { DomainResult, lookup } from "./services/api";
import DomainData from "./components/DomainData";

let theme = createTheme({
  palette: {
    mode: "dark",
  },
});
theme = responsiveFontSizes(theme);

const App: FC = () => {
  const [domain, setDomain] = useState<DomainResult | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSearch = (value: string): void => {
    setLoading(true);
    lookup(value)
      .then(setDomain)
      .finally(() => setLoading(false));
  };

  const handleReload = (): void => {
    if (domain) {
      handleSearch(domain.domain);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Typography align="center" variant="h4" sx={{ my: 6 }}>
          ✨ Stellar Name Service ✨
        </Typography>
        <Search onChange={handleSearch} />
        {domain ? (
          domain.isValid ? (
            <DomainData
              domain={domain}
              onReload={handleReload}
              onLoading={setLoading}
            />
          ) : (
            <Typography color="warning">Invalid domain</Typography>
          )
        ) : (
          <Typography color="text.secondary">No results</Typography>
        )}
      </Container>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.modal + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </ThemeProvider>
  );
};

export default App;
