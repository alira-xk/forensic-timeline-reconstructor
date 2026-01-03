import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
    Login: undefined;
    Main: undefined; // Tab Navigator
    CreateCase: undefined;
    Settings: undefined;
    CaseDetail: { caseId: string };
};

export type MainTabParamList = {
    Dashboard: undefined;
    CasesList: undefined;
    Timeline: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
    NativeStackScreenProps<RootStackParamList, T>;
