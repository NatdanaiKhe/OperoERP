export interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
}
