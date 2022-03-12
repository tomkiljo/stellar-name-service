import {
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, {
  FC,
  ReactElement,
  ReactFragment,
  useEffect,
  useState,
} from "react";
import { DomainResult } from "../services/api";
import ModifyDialog from "./ModifyDialog";
import RegisterDialog from "./RegisterDialog";

export interface DomainDataEntry {
  name: string;
  value: string;
  icon?: ReactElement | ReactFragment;
}

const cloneDomain = (domain: DomainResult): DomainResult => {
  return JSON.parse(JSON.stringify(domain));
};

const isExpired = (domain: DomainResult): boolean => {
  if (domain.expires) {
    const epochSeconds = Math.floor(Date.now() / 1000);
    return domain.expires <= epochSeconds;
  }
  return false;
};

const formatExpires = (domain: DomainResult): string => {
  if (domain.expires) {
    return new Date(domain.expires * 1000).toISOString();
  }
  return "-";
};

type DomainDataProps = {
  domain: DomainResult;
  onReload(): void;
  onLoading(loading: boolean): void;
};

const DomainData: FC<DomainDataProps> = ({ domain, onReload, onLoading }) => {
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [mutableDomain, setMutableDomain] = useState<DomainResult>();

  useEffect(() => {
    setMutableDomain(cloneDomain(domain));
  }, [domain, setMutableDomain]);

  const handleDataChange = (change: { [key: string]: string }): void => {
    const newDomain = cloneDomain(mutableDomain!);
    newDomain.owner!.data = Object.assign({}, newDomain.owner!.data, change);
    setMutableDomain(newDomain);
  };

  const handleRegisterDialogClose = (reload: boolean): void => {
    setRegisterDialogOpen(false);
    if (reload) onReload();
  };

  const handleModifyDialogClose = (reload: boolean): void => {
    setModifyDialogOpen(false);
    if (reload) onReload();
  };

  return (
    <Paper elevation={2} sx={{ padding: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6">{domain.domain}</Typography>
        {!!domain.asset ? (
          !isExpired(domain) ? (
            <Chip label="Reserved" color="primary" variant="outlined" />
          ) : (
            <Chip label="Expired" color="warning" variant="outlined" />
          )
        ) : (
          <Chip label="Free" color="success" variant="outlined" />
        )}
        {isExpired(domain) ? (
          <Chip
            label={`Expired: ${formatExpires(domain)}`}
            color="warning"
            variant="outlined"
          />
        ) : (
          <Chip
            label={`Expires: ${formatExpires(domain)}`}
            color="secondary"
            variant="outlined"
          />
        )}
      </Stack>
      {mutableDomain?.owner && (
        <>
          <TextField
            disabled
            fullWidth
            margin="normal"
            label="Owner"
            helperText="Account that owns this domain"
            value={mutableDomain.owner.account || ""}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Account"
            helperText="Account linked to this domain"
            value={mutableDomain.owner.data.account || ""}
            onChange={(event) =>
              handleDataChange({ account: event.target.value })
            }
          />
          <TextField
            fullWidth
            margin="normal"
            label="Discord username"
            helperText="Discord username linked to this domain"
            value={mutableDomain.owner.data.discord || ""}
            onChange={(event) =>
              handleDataChange({ discord: event.target.value })
            }
          />
          <TextField
            fullWidth
            margin="normal"
            label="Github username"
            helperText="Github username linked to this domain"
            value={mutableDomain.owner.data.github || ""}
            onChange={(event) =>
              handleDataChange({ github: event.target.value })
            }
          />
          <TextField
            fullWidth
            margin="normal"
            label="Free text"
            helperText="Free text linked to this domain"
            value={mutableDomain.owner.data.text || ""}
            onChange={(event) => handleDataChange({ text: event.target.value })}
          />
        </>
      )}
      <Stack direction="row">
        <Button
          disabled={!!domain.asset && !isExpired(domain)}
          onClick={() => setRegisterDialogOpen(true)}
        >
          Register
        </Button>
        <Button
          disabled={!!!domain.owner}
          onClick={() => setModifyDialogOpen(true)}
        >
          Modify
        </Button>
      </Stack>
      <RegisterDialog
        domain={domain}
        open={registerDialogOpen}
        onClose={handleRegisterDialogClose}
        onLoading={onLoading}
      />
      {mutableDomain && (
        <ModifyDialog
          domain={mutableDomain}
          open={modifyDialogOpen}
          onClose={handleModifyDialogClose}
          onLoading={onLoading}
        />
      )}
    </Paper>
  );
};

export default DomainData;
