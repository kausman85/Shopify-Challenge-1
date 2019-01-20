// Checks if a string denotes true
export const isTrue = str => {
  return str && (str === true || str === 'true' || str === 'True');
};

// Prevents SQL injections by limiting the symbol set for strings
export const validateString = str => {
  return str && str.length > 0 && /^[a-zA-Z0-9-_,./?!#%&*()]*$/.test(str) && str;
};

// Checks that the input is a valid int within bounds
export const validateInt = (str, lower, upper) => {
  const val = Number(str);
  return val && val === Math.round(val) && val >= lower && (!upper || val <= upper) && val;
};

// Checks that the input is a valid amount of money within bounds
export const validateMoney = (str, lower, upper) => {
  const val = Number(str) * 100;
  return validateInt(val, lower * 100, upper * 100) && val / 100;
};
