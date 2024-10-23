/**
 * Converts a string into camel case
 * @param str String that needs to be converted in camel case
 * @returns string
 */
export const camelize = (str: string) => {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "")
        .replace(/[^0-9a-zA-Z_]+/g, "");
};

/**
 * Converts a string into pascal case
 * @param str String that needs to be converted in pascal case
 * @returns string
 */
export const pascalize = (str: string) => {
    return str
        .replace(/\w+/g, function (w) {
            return w[0]?.toUpperCase() + w.slice(1).toLowerCase();
        })
        .replace(/\s+/g, "")
        .replace(/[^0-9a-zA-Z_]+/g, "");
};

/**
 * Sanitizes the string by replacing the first number with '_', removing all whitespace & any special characters
 * @param str String that needs to be cleaned
 * @returns string
 */
export const sanitize = (str: string) => {
    if (str.match(/^\d/)) {
        str = "_".concat(str);
    }
    return str.replace(/\s+/g, "").replace(/[^0-9a-zA-Z_]+/g, "");
};