/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
export const hasOwnDeepProperty = (
  obj: Record<string, any>,
  prop: string
): boolean => {
  if (typeof obj === 'object' && obj !== null) {
    // only performs property checks on objects (taking care of the corner case for null as well)
    if (obj.hasOwnProperty(prop)) {
      // if this object already contains the property, we are done
      return true;
    }
    for (const p in obj) {
      // otherwise iterate on all the properties of this object
      if (
        obj.hasOwnProperty(p) && // and as soon as you find the property you are looking for, return true
        // @ts-ignore
        hasOwnDeepProperty(obj[p], prop)
      ) {
        return true;
      }
    }
  }
  return false;
};

export const sanitize = (str: string): string => {
  return str.replace(/([^0-9])/g, '');
};
