export interface ScriptModule {
  up?: () => Promise<void>;
  default?: {
    up: () => Promise<void>;
  };
}
