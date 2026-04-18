import type { FieldValues } from 'react-hook-form';

import { TextInput, type TextInputProps } from './TextInput';

export interface TextAreaProps<T extends FieldValues> extends Omit<TextInputProps<T>, 'multiline'> {}

export function TextArea<T extends FieldValues>(props: TextAreaProps<T>) {
  return <TextInput {...props} multiline />;
}
