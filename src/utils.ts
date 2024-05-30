import type { DeepKeys } from 'formularity';

export const setViaPath = <
    TObj
    , TPath extends DeepKeys<TObj>
    , TNewValue
    >(
        obj: TObj
        , path: TPath
        , newValue: TNewValue
    ): TObj => {
    const keys = path
        .split( /\.|\[|\]/ )
        .filter( Boolean ) as Array<keyof TObj>;

    const lastKey = keys.pop();

    let current = obj;

    for ( const key of keys ) {
        if ( typeof current[ key ] !== 'object' ) {
            current[ key ] = typeof keys[ 0 ] === 'number'
                ? [] as never
                : {} as never;
        }
        current = current[ key ] as TObj;
    }

    if ( Array.isArray( current ) && lastKey === '' ) {
        current.push( newValue );
    } else {
        current[ lastKey as keyof TObj ] = newValue as never;
    }

    return obj as TObj;
};
