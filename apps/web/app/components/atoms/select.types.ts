export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type SelectProps = {
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  id?: string;
  disabled?: boolean;
};
