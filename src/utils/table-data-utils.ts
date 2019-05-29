import * as _ from "lodash";

/**
 * Utilities for handling table data
 */
export default class TableDataUtils {

  /**
   * Returns cell value
   * 
   * @param data table data
   * @param rowIndex row index
   * @param cellIndex cell index
   * @returns cell value or null if not found
   */
  public static getCellValue = (data: string[][], rowIndex: number, cellIndex: number) => {
    if (data.length < rowIndex) {
      return null;
    }

    const row = data[rowIndex];
    if (row.length < cellIndex) {
      return null;
    }

    return row[cellIndex];
  }

  /**
   * Sets cell value
   * 
   * @param data table data
   * @param rowIndex row index
   * @param cellIndex cell index
   * @param value value
   */
  public static setCellValue = (data: string[][], rowIndex: number, cellIndex: number, value: string): string[][] => {
    const result = _.cloneDeep(data); 

    while (data.length <= rowIndex) {
      result.push([]);
    }

    const row = result[rowIndex] || [];
    row[cellIndex] = value;

    return result;
  }

  /**
   * Finds cell index by value
   * 
   * @param data table data
   * @param rowIndex row index
   * @param value value
   * @returns cell index or -1 if not found
   */
  public static findCellIndex = (data: string[][], rowIndex: number, value: string): number => {
    if (data.length < rowIndex) {
      return -1;
    }

    return (data[rowIndex] || []).findIndex((cellValue) => {
      return cellValue == value;
    });
  }

  /**
   * Finds row index by value
   * 
   * @param data table data
   * @param cellIndex cell index
   * @param value value
   * @returns row index or -1 if not found
   */
  public static findRowIndex = (data: string[][], cellIndex: number, value: string): number => {
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const cellValue = TableDataUtils.getCellValue(data, rowIndex, cellIndex);
      if (cellValue == value) {
        return rowIndex;
      }
    }

    return -1;
  }

  /**
   * Returns cell count for a row
   * 
   * @param data table data
   * @param rowIndex row index
   * @returns row cell count for a row
   */
  public static getCellCount = (data: string[][], rowIndex: number): number => {
    if (data.length < rowIndex) {
      return 0;
    }

    return (data[rowIndex] || []).length;
  }

}