import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { Product } from "pakkasmarja-client";
import { Button, Confirm, Table, Header, List, Dimmer, Loader } from "semantic-ui-react";
import { Link } from "react-router-dom";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component state
 */
interface State {
  products: Product[];
  open: boolean;
  productsLoading: boolean;
  productId: string;
  productName: string;
}

/**
 * Class component for products list
 */
class ProductsList extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      products: [],
      open: false,
      productsLoading: false,
      productId: "",
      productName: ""
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ productsLoading: true });
    await this.loadProducts();
    this.setState({ productsLoading: false });
  }

  /**
   * Handle product delete
   * 
   */
  private handleDelete = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.productId) {
      return;
    }

    const productsService = await Api.getProductsService(this.props.keycloak.token);
    await productsService.deleteProduct(this.state.productId);
    await this.loadProducts();
    this.setState({ open: false });
  }

  /**
   * Load products
   */
  private loadProducts = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const products: Product[] = await productsService.listProducts(undefined, undefined, undefined, undefined, 9999);
    this.setState({ products });
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
              Ladataan tuotteita
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <BasicLayout>
        <Header floated='left' className="contracts-header">
          <p>Tuotteet</p>
        </Header>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={4}>
                Nimi
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Yksikkönimi
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Yksikkömäärä
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Yksikkökoko
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                <Button as={Link} to="/createProduct" color="red" style={{ width: "100%" }}>
                  Uusi tuote
                </Button>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.products.map((product: Product) => {
                return (
                  <Table.Row key={product.id}>
                    <Table.Cell>
                      {product.name}
                    </Table.Cell>
                    <Table.Cell>
                      {product.unitName}
                    </Table.Cell>
                    <Table.Cell>
                      {product.units}
                    </Table.Cell>
                    <Table.Cell>
                      {product.unitSize}
                    </Table.Cell>
                    <Table.Cell>
                      <List>
                        <List.Item>
                          <List.Content
                            as={Link}
                            to={`editProduct/${product.id}`}
                          >
                            <p className="plink">
                              Muokkaa tuotetta
                                    </p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content as={Link} to={`/productPrices/${product.id}`}>
                            <p className="plink">Muokkaa tuotteen hintoja</p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content>
                            <p onClick={() => this.setState({ open: true, productId: product.id || "", productName: product.name })} className="plink">Poista tuote</p>
                          </List.Content>
                        </List.Item>
                      </List>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            }
          </Table.Body>
        </Table>
        <Confirm open={this.state.open} size={"small"} content={"Haluatko varmasti poistaa tuotteen: " + this.state.productName} onCancel={() => this.setState({ open: false })} onConfirm={this.handleDelete} />
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

export default connect(mapStateToProps, mapDispatchToProps)(ProductsList);
