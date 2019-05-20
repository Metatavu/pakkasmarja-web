import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { ProductPrice } from "pakkasmarja-client";
import { Button, Confirm, Table, Header, List, Dimmer, Loader } from "semantic-ui-react";
import { Link } from "react-router-dom";
import CreateProductPriceModal from "./CreateProductPriceModal";
import * as moment from "moment";
import EditProductPriceModal from "./EditProductPriceModal";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match: any;
}

/**
 * Interface for component state
 */
interface State {
  open: boolean;
  createProductPriceModal: boolean;
  modalProductPriceId: string;
  productsLoading: boolean;
  productId: string;
  productPrices?: ProductPrice[];
  productPriceId: string;
  createModal: boolean;
  editModal: boolean;
}

/**
 * Class component for products prices list
 */
class ProductPricesList extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      open: false,
      createProductPriceModal: false,
      modalProductPriceId: "",
      productsLoading: false,
      productId: "",
      productPriceId: "",
      createModal: false,
      editModal: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const productId: string = this.props.match.params.productId;
    await this.setState({ productId });
    await this.loadProductsPrices();
  }

  /**
   * Handle product delete
   * 
   */
  private handleDelete = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.productPriceId) {
      return;
    }

    const productPricesService = await Api.getProductPricesService(this.props.keycloak.token);
    await productPricesService.deleteProductPrice(this.state.productId, this.state.productPriceId);
    this.setState({ open: false })
    await this.loadProductsPrices();
  }

  /**
   * Load products
   */
  private loadProductsPrices = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    this.setState({ productsLoading: true });
    const productPricesService = await Api.getProductPricesService(this.props.keycloak.token);
    const productPrices: ProductPrice[] = await productPricesService.listProductPrices(this.state.productId, "CREATED_AT_ASC", undefined, 50);
    this.setState({ productPrices, productsLoading: false });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.productsLoading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan tuotehintoja
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <BasicLayout>
        <Header floated='left' className="contracts-header">
          <p>Tuote hinnat</p>
        </Header>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={4}>
                Hinta
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Yksikkö
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Luotu
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Päivitetty
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.productPrices ? this.state.productPrices.map((productPrice: ProductPrice) => {
                return (
                  <Table.Row key={productPrice.id}>
                    <Table.Cell>
                      {productPrice.price}
                    </Table.Cell>
                    <Table.Cell >
                      {productPrice.unit}
                    </Table.Cell>
                    <Table.Cell >
                      {moment(productPrice.createdAt).format("DD.MM.YYYY")}
                    </Table.Cell>
                    <Table.Cell >
                      {moment(productPrice.updatedAt).format("DD.MM.YYYY")}
                    </Table.Cell>
                    <Table.Cell >
                      <List>
                        <List.Item>
                          <Button.Group floated="right" style={{ maxHeight: "37px" }}>
                            <Button onClick={() => this.setState({ editModal: true, productPriceId: productPrice.id || "" })} color="red">Muokkaa</Button>
                            <Button.Or text="" />
                            <Button onClick={() => this.setState({ open: true, productPriceId: productPrice.id || "" })} color="black">Poista</Button>
                          </Button.Group>
                          <Confirm open={this.state.open} size={"small"} content={"Haluatko varmasti poistaa tuotteen: " + productPrice.price} onCancel={() => this.setState({ open: false })} onConfirm={this.handleDelete} />
                        </List.Item>
                      </List>
                    </Table.Cell>
                  </Table.Row>
                );
              })
                : null}
          </Table.Body>
        </Table>
        <Button.Group floated="right" className="contract-button-group" >
          <Button as={Link} to="/productsManagement" inverted color="red">Takaisin</Button>
          <Button.Or text="" />
          <Button onClick={() => this.setState({ createModal: true })} color="red">Uusi hinta</Button>
        </Button.Group>
        <CreateProductPriceModal
          closeModal={() => this.setState({ createModal: false })}
          modalOpen={this.state.createModal}
          productId={this.state.productId}
          loadData={this.loadProductsPrices}
        />
        <EditProductPriceModal
          closeModal={() => this.setState({ editModal: false })}
          modalOpen={this.state.editModal}
          productPriceId={this.state.productPriceId}
          productId={this.state.productId}
          loadData={this.loadProductsPrices}
        />
      </BasicLayout>
    );
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductPricesList);
