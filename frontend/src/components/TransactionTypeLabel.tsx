import {
  PaymentOutlined,
  SavingsOutlined,
  LogoutOutlined,
  LoginOutlined,
} from '@mui/icons-material';
import type { TransactionType } from '../types/backend';
import { Tooltip } from '@mui/material';

export const TransactionTypeLabel = ({ type }: { type: TransactionType }) => {
  const transactionTypeLabels: Record<TransactionType, string> = {
    withdrawal: 'Withdrawal',
    'transfer-in': 'Transfer In',
    'transfer-out': 'Transfer Out',
    deposit: 'Deposit',
    reconciliation: 'Reconciliation',
  };
  const icon = {
    withdrawal: <PaymentOutlined />,
    'transfer-in': <LoginOutlined />,
    'transfer-out': <LogoutOutlined />,
    deposit: <SavingsOutlined />,
    reconciliation: null,
  }[type];
  return <Tooltip title={transactionTypeLabels[type]}>{icon!}</Tooltip>;
};
