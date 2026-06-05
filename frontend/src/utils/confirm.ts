export type ConfirmationRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  resolve: (confirmed: boolean) => void;
};

type ConfirmationListener = (request: ConfirmationRequest | null) => void;

let listener: ConfirmationListener | null = null;
let pendingRequest: ConfirmationRequest | null = null;

export const subscribeToConfirmations = (nextListener: ConfirmationListener) => {
  listener = nextListener;
  listener(pendingRequest);

  return () => {
    if (listener === nextListener) {
      listener = null;
    }
  };
};

const getActionDetails = (title: string) => {
  const normalized = title.toLowerCase();

  if (normalized.includes('reopen')) {
    return { confirmLabel: 'Reopen Case', destructive: false };
  }

  if (normalized.includes('close')) {
    return { confirmLabel: 'Close Case', destructive: false };
  }

  if (normalized.includes('remove')) {
    return { confirmLabel: 'Remove', destructive: true };
  }

  return { confirmLabel: 'Delete', destructive: true };
};

export const confirmDialog = (title: string, message: string) => {
  return new Promise<boolean>((resolve) => {
    if (pendingRequest) {
      pendingRequest.resolve(false);
    }

    const action = getActionDetails(title);
    pendingRequest = {
      title,
      message,
      resolve,
      ...action,
    };
    listener?.(pendingRequest);
  });
};

export const resolveConfirmation = (confirmed: boolean) => {
  const request = pendingRequest;
  pendingRequest = null;
  listener?.(null);
  request?.resolve(confirmed);
};
