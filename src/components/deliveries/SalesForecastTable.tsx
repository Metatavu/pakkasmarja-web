import * as React from "react";
import "../../styles/common.css";
import { Table, Input, Icon } from "semantic-ui-react";
import { Product } from "pakkasmarja-client";


/**
 * Interface for component props
 */
interface Props {
  title: string,
  name: string,
  rowCount: number,
  products: Product[],
  getRowHeader: (rowIndex: number) => string, 
  setRowHeader: (rowIndex: number, value: string) => void,
  getCellValue: (productId: string, rowIndex: number) => number | null,
  setCellValue: (productId: string, rowIndex: number, value: number | null) => void,
  onAddNewRow: () => void
}

/**
 * Interface for component state
 */
interface State {
  editRowHeader?: number,
  editProductId?: string,
  editRowIndex?: number,
  editValue?: number,
  editHeaderValue?: string
}

/**
 * Class for sales forecast data table component
 */
export default class SalesForecastDataTable extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
    };
  }

  /**
   * Render method
   */
  public render() {
    const rows = [];
    
    for (let rowIndex = 0; rowIndex < this.props.rowCount; rowIndex++) {
      rows.push(this.renderTableRow(rowIndex));
    };

    const products = this.props.products;
    const cellWidth = 100 / (this.props.products.length + 1);

    return (
      <div style={{ marginBottom: "10px" }}>
        <Table celled padded selectable inverted>
          <Table.Header>
            <Table.Row className="table-header-row" style={{ background: "#e01e36", color: "#fff"}}>
              <Table.HeaderCell>{ this.props.title }</Table.HeaderCell>
              {
                products.map((product) => {
                  return (
                    <Table.HeaderCell style={{ "width": `${cellWidth}%` }}> { product.name } </Table.HeaderCell>
                  )
                }) 
              }
            </Table.Row>
          </Table.Header>
          <Table.Body> { rows } </Table.Body>
        </Table>
        <div>
          <a onClick={ this.onNewClick }>
            <Icon name="plus"/> Lisää uusi
          </a>
        </div>
      </div>
    );
  }
  
  /**
   * Renders table row
   * 
   * @param row row data
   */
  private renderTableRow = (rowIndex: number) => {
    const products = this.props.products;
    const cellWidth = 100 / (this.props.products.length + 1);
    const rowHeader = this.props.getRowHeader(rowIndex);

    return (
      <Table.Row key={ `${this.props.name}-row-${rowIndex}` }>
        {
          this.state.editRowHeader == rowIndex ? this.renderRowHeaderEditor(rowIndex) : <Table.Cell style={{ background: "#fadde1", color: "#000" }} key={ `${this.props.name}-cell-header-${rowIndex}` } onClick={ () => this.onRowHeaderCellClick(rowIndex!, rowHeader) }> { rowHeader } </Table.Cell>
        }
        { 
          products.map((product) => {
            const value = this.props.getCellValue(product.id!, rowIndex!);

            return (
              <Table.Cell style={{ background: "#fadde1", color: "#000", textAlign: "center", "width": `${cellWidth}%`, padding: 0 }} key={ `${this.props.name}-cell-${rowIndex}-${product.id}` } onClick={ () => this.onCellClick(rowIndex!, product.id!, value) }>
                { this.state.editRowIndex == rowIndex && this.state.editProductId == product.id ? this.renderCellEditor(rowIndex!, product.id!) : <span style={{ }}> { value } </span> }
              </Table.Cell>
            )
          }) 
        }
      </Table.Row>
    );
  }

  /**
   * Renders cell editor
   * 
   * @param rowIndex row index
   * @param productId product id
   */
  private renderCellEditor = (rowIndex: number, productId: string) => {
    return (
      <span>
        <Input key={ `${this.props.name}-cell-editor-${rowIndex}-${productId}` } value={ this.state.editValue } type="number" onChange={ (event, data) => this.setState({ editValue: parseFloat(data.value) || 0 } ) } />
        <span key={ `${this.props.name}-cell-apply-${rowIndex}-${productId}` } style={{ marginLeft: "5px" }} onClick={ (event) => this.onApplyClick(event, rowIndex, productId) }><Icon key={ `${this.props.name}-cell-apply-${rowIndex}-${productId}-icon` } color="green" name="checkmark"/></span>
        <span key={ `${this.props.name}-cell-cancel-${rowIndex}-${productId}` } onClick={ (event) => this.onCancelClick(event) }><Icon key={ `${this.props.name}-cell-cancel-${rowIndex}-${productId}-icon` } color="red" name="cancel"/></span>
      </span>
    );
  }

  /**
   * Renders cell editor
   * 
   * @param rowIndex row index
   * @param productId product id
   */
  private renderRowHeaderEditor = (rowIndex: number) => {
    return (
      <Table.Cell style={{ background: "#fadde1", color: "#000", padding: "5px" }} key={ `${this.props.name}-cell-header-${rowIndex}` }>
        <Input key={ `${this.props.name}-row-header-editor-${rowIndex}` } value={ this.state.editHeaderValue } type="text" onChange={ (event, data) => this.setState({ editHeaderValue: data.value } ) } />
        <span key={ `${this.props.name}-row-header-apply-${rowIndex}` } style={{ marginLeft: "5px" }} onClick={ (event) => this.onRowHeaderApplyClick(event, rowIndex) }><Icon key={ `${this.props.name}-header-apply-${rowIndex}-icon` } color="green" name="checkmark"/></span>
        <span key={ `${this.props.name}-row-header-cancel-${rowIndex}` } onClick={ (event) => this.onRowHeaderCancelClick(event) }><Icon key={ `${this.props.name}-header-cancel-${rowIndex}-icon` } color="red" name="cancel"/></span>
      </Table.Cell>
    );
  }

  private onNewClick = () => {
    this.props.onAddNewRow();
  }

  /**
   * Event handler for cancel click
   * 
   * @param event event
   * @param rowIndex row index
   * @param productId product id
   */
  private onApplyClick = (event: React.MouseEvent<HTMLSpanElement>, rowIndex: number, productId: string) => {
    event.preventDefault();
    event.stopPropagation();

    this.setState({
      editRowIndex: undefined,
      editProductId: undefined,
      editRowHeader: undefined
    });

    this.props.setCellValue(productId, rowIndex, this.state.editValue || 0);
  }

  /**
   * Event handler for cancel click
   * 
   * @param event event
   */
  private onCancelClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();

    this.setState({
      editRowIndex: undefined,
      editProductId: undefined,
      editRowHeader: undefined
    });
  }
  
  /**
   * Cell click event handler
   * 
   * @param rowIndex row index
   * @param productId product id
   * @param value value
   */
  private onCellClick = (rowIndex: number, productId: string, value: number | null) => {
    this.setState({
      editRowIndex: rowIndex,
      editProductId: productId,
      editRowHeader: undefined,
      editValue: value || 0
    });
  }
  
  /**
   * Cell click event handler
   * 
   * @param rowIndex row index
   * @param productId product id
   * @param value value
   */
  private onRowHeaderCellClick = (rowIndex: number, value: string) => {
    this.setState({
      editRowIndex: undefined,
      editProductId: undefined,
      editRowHeader: rowIndex,
      editHeaderValue: value
    });
  }

  /**
   * Event handler for cancel click
   * 
   * @param event event
   * @param rowIndex row index
   * @param productId product id
   */
  private onRowHeaderApplyClick = (event: React.MouseEvent<HTMLSpanElement>, rowIndex: number) => {
    event.preventDefault();
    event.stopPropagation();

    this.setState({
      editRowIndex: undefined,
      editProductId: undefined,
      editRowHeader: undefined
    });

    this.props.setRowHeader(rowIndex, this.state.editHeaderValue || "");
  }

  /**
   * Event handler for cancel click
   * 
   * @param event event
   */
  private onRowHeaderCancelClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();

    this.setState({
      editRowIndex: undefined,
      editProductId: undefined,
      editRowHeader: undefined
    });
  }
}