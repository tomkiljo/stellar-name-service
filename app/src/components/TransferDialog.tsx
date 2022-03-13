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
import { transferDomainStart } from "../services/stellar";

type TransferDialogProps = {
  domain: DomainResult;
  open: boolean;
  onClose(reload: boolean): void;
  onLoading(loading: boolean): void;
};

const TransferDialog: FC<TransferDialogProps> = ({
  domain,
  open,
  onClose,
  onLoading,
}) => {
  const [inputError, setInputError] = useState<string | undefined>();
  const [registerError, setRegisterError] = useState<string | undefined>();
  const targetAccountRef = useRef(null);
  const userSecretRef = useRef(null);

  useEffect(() => {
    setInputError(undefined);
    setRegisterError(undefined);
  }, [open, setInputError, setRegisterError]);

  const handleTransfer = () => {
    // @ts-ignore
    const targetAccount = targetAccountRef.current.value;
    // @ts-ignore
    const userSecret = userSecretRef.current.value;
    try {
      const userKeypair = Keypair.fromSecret(userSecret);
      onLoading(true);
      transferDomainStart(domain, userKeypair, targetAccount)
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
      <DialogTitle>Transfer domain</DialogTitle>
      <DialogContent>
        {!!registerError && (
          <Box sx={{ p: 1, mb: 1, backgroundColor: "error.main" }}>
            <Typography color="white">{registerError}</Typography>
          </Box>
        )}
        <DialogContentText>
          To transfer domain '{domain.domain}', please enter target account and
          your secret key here. Note that subdomains can only be transferred by
          parent domain owner.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          inputRef={targetAccountRef}
          label="Target account"
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
        <Button onClick={handleTransfer}>Transfer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransferDialog;
