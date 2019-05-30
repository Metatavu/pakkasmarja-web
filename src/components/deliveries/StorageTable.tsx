import * as React from "react";
import "../../styles/common.css";
import { DeliveryQuality, Product } from "pakkasmarja-client";
import { Table, Input, Icon } from "semantic-ui-react";


/**
 * Interface for component props
 */
interface Props {
  qualities: DeliveryQuality[],
  products: Product[],
  getCellValue: (productId: string, qualityId: string) => number | null,
  onApplyValue: (productId: string, qualityId: string, value: number) => void
}

/**
 * Interface for component state
 */
interface State {
  editProductId?: string,
  editQualityId?: string,
  editValue?: number
}

/**
 * Class for storage data table component
 */
export default class StorageDataTable extends React.Component<Props, State> {

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
    const products = this.props.products;
    const cellWidth = 100 / (this.props.products.length + 1);

    return (
      <Table celled padded selectable>
        <Table.Header>
          <Table.Row className="table-header-row">
            <Table.HeaderCell>Laatu</Table.HeaderCell>
            {
              products.map((product) => {
                return (
                  <Table.HeaderCell style={{ "width": `${cellWidth}%` }}> { product.name } </Table.HeaderCell>
                )
              }) 
            }
          </Table.Row>
        </Table.Header>
        <Table.Body>
          { 
            this.props.qualities.map((quality) => {
              return this.renderStorageTableRow(quality);
            }) 
          } 
        </Table.Body>
      </Table>
    );
  }
  
  /**
   * Renders storage table row
   * 
   * @param quality quality
   */
  private renderStorageTableRow = (quality: DeliveryQuality) => {
    const products = this.props.products;
    const cellWidth = 100 / (products.length + 1);

    return (
      <Table.Row key={ `storage-row-${quality.id}` }>
        <Table.Cell key={ `storage-cell-header-${quality.id}` }> { this.renderQualityIcon(quality) } { quality.name } </Table.Cell>
        { 
          products.map((product) => {
            const value = this.props.getCellValue(product.id!, quality.id!);

            return (
              <Table.Cell style={{ textAlign: "center", "width": `${cellWidth}%`, padding: 0, background: value ? quality.color + "55" : "#fff" }} key={ `storage-cell-${quality.id}-${product.id}` } onClick={ () => this.onCellClick(quality.id!, product.id!, value) }>
                { this.state.editQualityId == quality.id && this.state.editProductId == product.id ? this.renderCellEditor(quality.id!, product.id!) : <span> { value } </span> }
              </Table.Cell>
            )
          }) 
        }
      </Table.Row>
    );
  }

  /**
   * Renders quality icon
   * 
   * @param quality quality
   */
  private renderQualityIcon = (quality: DeliveryQuality) => {
    return <div key={ `storage-cell-quality-icon-${quality.id}` } style={{ background: quality.color, marginRight: "10px", color: "#fff", width: "20px", display: "inline-block", borderRadius: "10px", textAlign: "center", height: "20px", lineHeight: "20px", fontSize: "12px", fontWeight: "bold" }}> { quality.name.charAt(0) } </div>
  }

  /**
   * Renders cell editor
   * 
   * @param qualityId quality id
   * @param productId product id
   */
  private renderCellEditor = (qualityId: string, productId: string) => {
    return (
      <span>
        <Input key={ `storage-cell-editor-${qualityId}-${productId}` } value={ this.state.editValue } type="number" onChange={ (event, data) => this.setState({ editValue: parseFloat(data.value) || 0 } ) } />
        <span key={ `storage-cell-apply-${qualityId}-${productId}` } style={{ marginLeft: "5px" }} onClick={ (event) => this.onApplyClick(event, qualityId, productId) }><Icon key={ `storage-cell-apply-${qualityId}-${productId}-icon` } color="green" name="checkmark"/></span>
        <span key={ `storage-cell-cancel-${qualityId}-${productId}` } onClick={ (event) => this.onCancelClick(event) }><Icon key={ `storage-cell-cancel-${qualityId}-${productId}-icon` } color="red" name="cancel"/></span>
      </span>
    );
  }

  /**
   * Event handler for cancel click
   * 
   * @param event event
   * @param qualityId quality id
   * @param productId product id
   */
  private onApplyClick = (event: React.MouseEvent<HTMLSpanElement>, qualityId: string, productId: string) => {
    event.preventDefault();
    event.stopPropagation();

    this.setState({
      editQualityId: undefined,
      editProductId: undefined
    });

    this.props.onApplyValue(productId, qualityId, this.state.editValue || 0);
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
      editQualityId: undefined,
      editProductId: undefined
    });
  }
  
  /**
   * Cell click event handler
   * 
   * @param qualityId quality id
   * @param productId product id
   * @param value value
   */
  private onCellClick = (qualityId: string, productId: string, value: number | null) => {
    this.setState({
      editQualityId: qualityId,
      editProductId: productId,
      editValue: value || 0
    });
  }
}