import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  SignUp: { email?: string } | undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
  OtpVerification: { email: string };
  Main: undefined;
  CreateCase: undefined;
  Settings: undefined;
  CaseDetail: { caseId: string };
  Timeline: { caseId?: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  CasesList: undefined;
  Timeline: { caseId?: string } | undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;