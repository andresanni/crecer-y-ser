import type { FormInstance } from 'antd';

interface FormValidationFailure {
  errorFields?: Array<{ name: Array<string | number> }>;
}

export const focusFirstFormError = <Values,>(form: FormInstance<Values>, error: unknown) => {
  const firstError = (error as FormValidationFailure)?.errorFields?.[0];
  if (firstError) form.scrollToField(firstError.name, { block: 'center', focus: true });
};
