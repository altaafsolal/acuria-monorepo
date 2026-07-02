export interface BaserowTable {
  id: number;
  name: string;
}

export interface SelectOption {
  id?: number;
  value: string;
  color: string;
}

export interface BaserowField {
  id: number;
  name: string;
  type: string;
  select_options?: SelectOption[];
}

export interface FieldDef {
  name: string;
  type: string;
  select_options?: SelectOption[];
  link_row_table_id?: number;
  date_include_time?: boolean;
  date_format?: string;
}

export interface BaserowListResponse<T> {
  count?: number;
  results: T[];
  next: string | null;
  previous?: string | null;
}

export interface BaserowApplication {
  id: number;
  workspace?: { id: number };
  workspace_id?: number;
}

export interface AxiosLikeError {
  response?: {
    status?: number;
    data?: {
      detail?: string;
      error?: string;
      description?: string;
    };
  };
  message?: string;
}
