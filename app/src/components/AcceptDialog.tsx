import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import { FC, useEffect, useRef, useState } from "react";
import { Keypair } from "stellar-sdk";
import { DomainResult } from "../services/api";
import { transferDomainEnd } from "../services/stellar";

type AcceptsDialogProps = {
  domain: DomainResult;
  open: boolean;
  onClose(reload: boolean): void;
  onLoading(loading: boolean): void;
};

const AcceptDialog: FC<AcceptsDialogProps> = ({
  domain,
  open,
  onClose,
  onLoading,
}) => {
  const [inputError, setInputError] = useState<string | undefined>();
  const [registerError, setRegisterError] = useState<string | undefined>();
  const userSecretRef = useRef(null);

  useEffect(() => {
    setInputError(undefined);
    setRegisterError(undefined);
  }, [open, setInputError, setRegisterError]);

  const handleAccept = () => {
    // @ts-ignore
    const userSecret = userSecretRef.current.value;
    try {
      const userKeypair = Keypair.fromSecret(userSecret);
      onLoading(true);
      transferDomainEnd(domain, userKeypair)
        .then((res) => {
          onClose(true);
        })
        .catch((err) => {
          console.error(err);
          const reason = err?.response?.data?.message || "unknown reason";
          setRegisterError(`Domain transfer failed: ${reason}`);
        })
        .finally(() => onLoading(false));

      setInputError(undefined);
    } catch (err) {
      setInputError("Invalid secret key");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Accept domain transfer</DialogTitle>
      <DialogContent>
        {!!registerError && (
          <Box sx={{ p: 1, mb: 1, backgroundColor: "error.main" }}>
            <Typography color="white">{registerError}</Typography>
          </Box>
        )}
        <DialogContentText>
          To accept domain transfer '{domain.domain}', please enter your secret
          key here.
        </DialogContentText>
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
        <Button onClick={handleAccept}>Accept</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AcceptDialog;
