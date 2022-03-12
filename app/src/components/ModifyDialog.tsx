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
import { modifyDomain } from "../services/stellar";

type ModifyDialogProps = {
  domain: DomainResult;
  open: boolean;
  onClose(reload: boolean): void;
  onLoading(loading: boolean): void;
};

const ModifyDialog: FC<ModifyDialogProps> = ({
  domain,
  open,
  onClose,
  onLoading,
}) => {
  const [inputError, setInputError] = useState<string | undefined>();
  const [modifyError, setModifyError] = useState<string | undefined>();
  const userSecretRef = useRef(null);

  useEffect(() => {
    setInputError(undefined);
    setModifyError(undefined);
  }, [open, setInputError, setModifyError]);

  const handleModify = () => {
    // @ts-ignore
    const userSecret = userSecretRef.current.value;
    try {
      const userKeypair = Keypair.fromSecret(userSecret);
      onLoading(true);
      modifyDomain(domain, userKeypair)
        .then((res) => {
          onClose(true);
        })
        .catch((err) => {
          console.error(err);
          setModifyError("Domain modification failed");
        })
        .finally(() => onLoading(false));

      setInputError(undefined);
    } catch (err) {
      setInputError("Invalid secret key");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Modify domain</DialogTitle>
      <DialogContent>
        {!!modifyError && (
          <Box sx={{ p: 1, mb: 1, backgroundColor: "error.main" }}>
            <Typography color="white">{modifyError}</Typography>
          </Box>
        )}
        <DialogContentText>
          Modify domain '{domain.domain}', please enter your secret key here.
          Note that you must have signer permissions for the owner account.
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
        <Button onClick={handleModify}>Modify</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModifyDialog;
