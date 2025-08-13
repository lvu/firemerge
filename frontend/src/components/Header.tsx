import {
  Box,
  AppBar,
  Toolbar,
  Stack,
  useTheme,
  useMediaQuery,
  Typography,
  Grid,
} from '@mui/material';
import type { Account, StatementTransaction } from '../types/backend';
import Logo from '../assets/firemerge.svg?react';
import { useAccountDetails, useCurrencies } from '../hooks/backend';
import { useScrollTrigger } from '../hooks/scrollTrigger';

export const Header = ({
  currentAccount,
  statement,
  onClick,
}: {
  currentAccount?: Account;
  statement?: StatementTransaction[];
  onClick: () => void;
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: currentAccountDetails } = useAccountDetails(currentAccount?.id);
  const { data: currencies } = useCurrencies();
  const scrollTrigger = useScrollTrigger(100, 50);

  const accountCurrencySymbol = currentAccountDetails?.currency_id
    ? currencies?.[currentAccountDetails.currency_id]?.symbol
    : '';

  const statementInfo =
    statement === undefined
      ? undefined
      : {
          num_transactions: statement.length,
          start_date: statement[0]?.date,
          end_date: statement[statement.length - 1]?.date,
        };

  const showStatementInfo = !scrollTrigger || !isMobile;

  return (
    <AppBar
      position="sticky"
      onClick={onClick}
      sx={{ cursor: currentAccount ? 'pointer' : 'default' }}
    >
      <Toolbar sx={{ py: 2 }}>
        <Stack direction="row" spacing={3} alignItems="center" width="100%">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ borderRadius: '50%', overflow: 'hidden', height: '3rem', width: '3rem' }}>
              <Logo width={'100%'} height={'100%'} fill="blue" />
            </Box>
            {!isMobile && (
              <Typography variant="h6" component="h1">
                Firemerge
              </Typography>
            )}
          </Box>
          <Grid container spacing={2} alignItems="center" justifyContent="center" width="100%">
            <Grid size={{ xs: 12, sm: 6 }}>
              {currentAccount ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {currentAccount.name}
                  </Typography>
                  <Typography variant="subtitle2">
                    {accountCurrencySymbol}&nbsp;{currentAccountDetails?.current_balance}
                  </Typography>
                </Stack>
              ) : (
                <Typography>No account selected</Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} display={showStatementInfo ? 'block' : 'none'}>
              {currentAccount && statementInfo !== undefined ? (
                <Stack direction="column" spacing={1}>
                  <Typography>{statementInfo.num_transactions} transactions</Typography>
                  <Typography>
                    {new Date(statementInfo.start_date).toLocaleDateString()}&nbsp;&ndash;&nbsp;
                    {new Date(statementInfo.end_date).toLocaleDateString()}
                  </Typography>
                </Stack>
              ) : (
                <Typography>No statement uploaded</Typography>
              )}
            </Grid>
          </Grid>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
