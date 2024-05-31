// Libraries
import {
    SafeParseError
    , ZodFormattedError
    , ZodSchema
} from 'zod';

// Types
import {
    DeepKeys
    , DeepValue
} from 'formularity';
import { setViaPath } from './utils';

type FormValues = Record<PropertyKey, unknown> | null;
type FormErrors<TFormValues extends FormValues> = MapNestedPrimitivesTo<TFormValues, string> | EmptyObject;
type EmptyObject = Record<string, never>;
type Primitive = string | number | boolean;

type MapNestedPrimitivesTo<TObj, Output = string> = {
    [K in keyof TObj]?: TObj[K] extends Array<infer U>
        ? Array<
            U extends object
                ? MapNestedPrimitivesTo<U>
                : U extends Primitive
                    ? Output
                    : never
            >
        : TObj[K] extends object
            ? MapNestedPrimitivesTo<TObj[K]>
            : Output;
};

type ValidationHandler<TFormValues extends FormValues> =
    ( values: TFormValues ) => Promise<Partial<FormErrors<TFormValues>> | null> | Partial<FormErrors<TFormValues>>;

type SingleFieldValidator<
    TFormValues extends FormValues
    , TFieldName extends DeepKeys<TFormValues> = DeepKeys<TFormValues>
> = ( value: DeepValue<TFormValues, TFieldName> ) => Promise<string | Nullish> | string | Nullish;

type Nullish = null | undefined;

const parseZodErrors = <
    T extends SafeParseError<TFormValues>
    , TFormValues extends FormValues = FormValues
>( errorObj: T, singleFieldValidation?: boolean ) => {
    const formattedZodErrors = errorObj.error.format();

    const formErrors: FormErrors<TFormValues> = {};

    //just return all field errors for the single field -> for singleFieldValidators
    if ( singleFieldValidation ) {
        return formattedZodErrors._errors.join( ',' );
    }

    traverseErrors( formattedZodErrors, formErrors );

    return formErrors as FormErrors<TFormValues>;
};

const traverseErrors = <TFormValues extends FormValues>(
    errors: ZodFormattedError<TFormValues>
    , formErrors: FormErrors<TFormValues>
    , path: string[] = []
) => {
    if ( errors._errors.length > 0 ) {
        const errorPath = path.join( '.' );
        setViaPath( formErrors, errorPath as DeepKeys<FormErrors<TFormValues>>, errors._errors.join( ', ' ) );
    }

    for ( const key in errors ) {
        if ( key !== '_errors' && errors[ key as keyof typeof errors ] ) {
            traverseErrors( errors[ key ] as ZodFormattedError<TFormValues>, formErrors, [ ...path, key ] );
        }
    }
};

export function zodAdapter<
    TFormValues extends FormValues
    , TFieldName extends DeepKeys<TFormValues>
    , TSchemaInput extends DeepValue<TFormValues, TFieldName> = DeepValue<TFormValues, TFieldName>
>(
    schema: ZodSchema<TSchemaInput>
    , options: { async?: boolean; isField: true }
): SingleFieldValidator<TFormValues, TFieldName>;

export function zodAdapter<TFormValues extends FormValues = FormValues>(
    schema: ZodSchema<TFormValues>
    , options?: { async?: boolean }
): ValidationHandler<TFormValues>;

export function zodAdapter<
    TSchemaInput extends DeepValue<TFormValues, TFieldName>
    , TFormValues extends FormValues = FormValues
    , TFieldName extends DeepKeys<TFormValues> = DeepKeys<TFormValues>
> (
    schema: ZodSchema<TSchemaInput>
    , options?: { async?: boolean; isField?: boolean | never }
) {
    const isSingleFieldValidation = options?.isField;

    const handler = async ( valueOrValues: TFormValues | TSchemaInput ) => {
        const validationResult = await schema[
            options?.async
                ? 'safeParseAsync'
                : 'safeParse'
        ]( valueOrValues );

        if ( validationResult.success ) return null;

        return parseZodErrors( validationResult, isSingleFieldValidation );
    };

    if ( isSingleFieldValidation ) return handler as SingleFieldValidator<TFormValues, TFieldName>;

    return handler as ValidationHandler<TFormValues>;

}
