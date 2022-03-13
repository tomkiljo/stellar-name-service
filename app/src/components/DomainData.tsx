import {
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
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
import SubregisterDialog from "./SubregisterDialog";
import TransferDialog from "./TransferDialog";
import AcceptDialog from "./AcceptDialog";

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
  const [subregisterDialogOpen, setSubregisterDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
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

  const handleSubregisterDialogClose = (reload: boolean): void => {
    setSubregisterDialogOpen(false);
    if (reload) onReload();
  };

  const handleModifyDialogClose = (reload: boolean): void => {
    setModifyDialogOpen(false);
    if (reload) onReload();
  };

  const handleTransferDialogClose = (reload: boolean): void => {
    setTransferDialogOpen(false);
    if (reload) onReload();
  };

  const handleAcceptDialogClose = (reload: boolean): void => {
    setAcceptDialogOpen(false);
    if (reload) onReload();
  };

  return (
    <Paper elevation={2} sx={{ padding: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6">{domain.domain}</Typography>
        {!!domain.asset ? (
          !domain.isInTransfer ? (
            !isExpired(domain) ? (
              <Chip label="Reserved" color="primary" variant="outlined" />
            ) : (
              <Chip label="Claimable" color="success" variant="outlined" />
            )
          ) : (
            <Chip label="Transferring" color="info" variant="outlined" />
          )
        ) : (
          <Chip label="Available" color="success" variant="outlined" />
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
            label="Issuer"
            helperText="Domain issuer account"
            value={mutableDomain.asset?.issuer || ""}
          />
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
      {!domain?.isSubdomain && domain?.subdomains && (
        <>
          <Divider textAlign="left" sx={{ my: 2 }}>
            Subdomains
          </Divider>

          {domain.subdomains.map((subdomain) => (
            <Typography variant="h6">{subdomain.domain}</Typography>
          ))}
          <Button
            startIcon={<AddCircleIcon />}
            disabled={!!!domain.owner}
            onClick={() => setSubregisterDialogOpen(true)}
          >
            Create subdomain
          </Button>
        </>
      )}

      <Divider sx={{ my: 2 }} />
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
        <Divider orientation="vertical" flexItem />
        <Button
          disabled={!!!domain.owner || isExpired(domain) || domain.isInTransfer}
          onClick={() => setTransferDialogOpen(true)}
        >
          Transfer
        </Button>
        <Button
          disabled={!!!domain.owner || !domain.isInTransfer}
          onClick={() => setAcceptDialogOpen(true)}
        >
          Accept
        </Button>
      </Stack>
      <RegisterDialog
        domain={domain}
        open={registerDialogOpen}
        onClose={handleRegisterDialogClose}
        onLoading={onLoading}
      />
      <SubregisterDialog
        domain={domain}
        open={subregisterDialogOpen}
        onClose={handleSubregisterDialogClose}
        onLoading={onLoading}
      />
      <TransferDialog
        domain={domain}
        open={transferDialogOpen}
        onClose={handleTransferDialogClose}
        onLoading={onLoading}
      />
      <AcceptDialog
        domain={domain}
        open={acceptDialogOpen}
        onClose={handleAcceptDialogClose}
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
