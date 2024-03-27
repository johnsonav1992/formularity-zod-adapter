import {
    DeepKeys
    , DeepValue
    , Nullish
} from './utilityTypes';

export type FormValues = Record<PropertyKey, unknown> | null;

export type SingleFieldValidator<
    TFormValues extends FormValues
    , TFieldName extends DeepKeys<TFormValues> = DeepKeys<TFormValues>
> = ( value: DeepValue<TFormValues, TFieldName> ) => Promise<string | Nullish> | string | Nullish;
