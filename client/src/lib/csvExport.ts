/**
 * Utility to export data to CSV format
 * @param headers Array of column headers
 * @param data Array of data rows, where each row is an array of values
 * @param filename The name of the file to download (without .csv extension)
 */
export function exportToCsv(
  headers: string[], 
  data: (string | number | boolean)[][], 
  filename: string
): void {
  // Combine header and rows
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...data.map(row => 
      row.map(item => {
        // Handle values with commas by enclosing in quotes
        const value = String(item).replace(/"/g, '""');
        return /[,"\n]/.test(value) ? `"${value}"` : value;
      }).join(",")
    )].join("\n");

  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Utility to convert an object to a CSV row
 * @param obj Object to convert to a row
 * @param keys Array of keys to extract from the object
 * @param transform Optional transform function for each value
 * @returns Array of values ready for CSV export
 */
export function objectToCsvRow<T extends Record<string, any>>(
  obj: T, 
  keys: (keyof T)[], 
  transform?: (key: keyof T, value: any) => string | number | boolean
): (string | number | boolean)[] {
  return keys.map(key => {
    const value = obj[key];
    if (transform) {
      return transform(key, value);
    }
    
    // Handle special cases
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.join('; ');
      }
      return JSON.stringify(value);
    }
    
    return value;
  });
}

/**
 * Prepare data for CSV export from an array of objects
 * @param objects Array of objects to export
 * @param headers Array of column headers
 * @param keys Array of keys to extract for each object
 * @param transform Optional transform function for each value
 * @param filename The name of the file to download (without .csv extension)
 */
export function exportObjectsToCsv<T extends Record<string, any>>(
  objects: T[],
  headers: string[],
  keys: (keyof T)[],
  filename: string,
  transform?: (key: keyof T, value: any) => string | number | boolean
): void {
  const rows = objects.map(obj => objectToCsvRow(obj, keys, transform));
  exportToCsv(headers, rows, filename);
}