import { IconButton, InputBase, Paper, Stack } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FC } from "react";
import { toASCII } from "punycode";

type SearchProps = {
  onChange(value: string): void;
};

const Search: FC<SearchProps> = ({ onChange }) => {
  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const formElements = form.elements as typeof form.elements & {
      searchInput: { value: string };
    };
    let search = formElements.searchInput.value;
    search = toASCII(search);
    onChange(search);
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ my: 2 }}>
      <Stack direction="row" spacing={1} sx={{ px: 1 }}>
        <InputBase
          id="searchInput"
          sx={{ flexGrow: 1 }}
          placeholder="Search domain"
          inputProps={{ "aria-label": "search domain" }}
        />
        <IconButton type="submit" aria-label="search">
          <SearchIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
};

export default Search;
