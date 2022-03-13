import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { FC, useEffect, useRef, useState } from "react";
import { Keypair } from "stellar-sdk";
import { DomainResult } from "../services/api";
import { registerSubdomain } from "../services/stellar";

type SubregisterDialogProps = {
  domain: DomainResult;
  open: boolean;
  onClose(reload: boolean): void;
  onLoading(loading: boolean): void;
};

const SubregisterDialog: FC<SubregisterDialogProps> = ({
  domain,
  open,
  onClose,
  onLoading,
}) => {
  const [inputError, setInputError] = useState<string | undefined>();
  const [modifyError, setModifyError] = useState<string | undefined>();
  const userSecretRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    setInputError(undefined);
    setModifyError(undefined);
  }, [open, setInputError, setModifyError]);

  const handleRegister = () => {
    // @ts-ignore
    const userSecret = userSecretRef.current.value;
    // @ts-ignore
    const label = labelRef.current.value;
    try {
      const userKeypair = Keypair.fromSecret(userSecret);
      onLoading(true);
      registerSubdomain(domain, label, userKeypair)
        .then((res) => {
          onClose(true);
        })
        .catch((err) => {
          console.error(err);
          setModifyError("Subdomain register failed");
        })
        .finally(() => onLoading(false));

      setInputError(undefined);
    } catch (err) {
      setInputError("Invalid secret key");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create subdomain</DialogTitle>
      <DialogContent>
        {!!modifyError && (
          <Box sx={{ p: 1, mb: 1, backgroundColor: "error.main" }}>
            <Typography color="white">{modifyError}</Typography>
          </Box>
        )}
        <DialogContentText>
          Create subdomain for '{domain.domain}', please enter the label and
          your secret key here.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          inputRef={labelRef}
          label="Subdomain label"
          type="text"
          fullWidth
          variant="standard"
        />
        <TextField
          autoFocus
          margin="dense"
          inputRef={userSecretRef}
          label="User Secret Key"
          type="text"
          fullWidth
          variant="standard"
          error={!!inputError}
          helperText={inputError}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button onClick={handleRegister}>Register</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubregisterDialog;
