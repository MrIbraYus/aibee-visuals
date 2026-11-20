declare module "@paystack/inline-js" {
  export type PaystackTransaction = { reference: string; trans?: string; status?: string; message?: string };
  type Callbacks = {
    onSuccess?: (tx: PaystackTransaction) => void;
    onCancel?: () => void;
    onLoad?: (response: unknown) => void;
    onError?: (error: { message: string }) => void;
  };
  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: Callbacks): void;
    cancelTransaction(id?: string): void;
  }
}
