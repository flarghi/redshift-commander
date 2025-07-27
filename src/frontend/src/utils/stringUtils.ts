export const truncateString = (str: string, maxLength: number = 30): string => {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
};

export const shouldTruncate = (str: string, maxLength: number = 30): boolean => {
  return str.length > maxLength;
};