import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import Api, { Product } from "pakkasmarja-client";
import { Button, Confirm, Table, Header, List, Dimmer, Loader, Modal } from "semantic-ui-react";
import { Link } from "react-router-dom";
import ProductViewModal from "./ProductViewModal";

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
  productViewModal: boolean;
  modalProductId: string;
  productsLoading: boolean;
  productId: string;
  errorModal: boolean;
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
      productViewModal: false,
      modalProductId: "",
      productsLoading: false,
      productId: "",
      errorModal: false
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
    const data = await productsService.deleteProduct(this.state.productId);
    if (data.name == 'SequelizeForeignKeyConstraintError') {
      this.setState({ open: false, errorModal: true });
    } else {
      this.setState({ open: false })
      await this.loadProducts();
    }
  }

  /**
   * Load products
   */
  private loadProducts = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const products: Product[] = await productsService.listProducts();
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
              <Table.HeaderCell width={13}>
                Tuotteen nimi
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
                    <Table.Cell className="open-modal-element" onClick={() => { this.setState({ productViewModal: true, modalProductId: product.id || "" }) }}>
                      {product.name}
                    </Table.Cell>
                    <Table.Cell >
                      <List>
                        <List.Item>
                          <Button.Group floated="right" style={{ maxHeight: "37px" }}>
                            <Button as={Link} to={`editProduct/${product.id}`} style={{ display: "flex", alignItems: "center" }} color="red">Muokkaa</Button>
                            <Button.Or text="" />
                            <Button onClick={() => this.setState({ open: true, productId: product.id || "" })} color="black">Poista</Button>
                          </Button.Group>
                          <Confirm open={this.state.open} size={"small"} content={"Haluatko varmasti poistaa tuotteen: " + product.name} onCancel={() => this.setState({ open: false })} onConfirm={this.handleDelete} />
                        </List.Item>
                      </List>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            }
          </Table.Body>
        </Table>
        <Modal size="small" open={this.state.errorModal} onClose={() => this.setState({ errorModal: false })} closeIcon>
          <Modal.Content>Virhe! Tuote käytössä, ei voida poistaa!</Modal.Content>
        </Modal>
        <ProductViewModal
          modalOpen={this.state.productViewModal}
          closeModal={() => this.setState({ productViewModal: false })}
          productId={this.state.modalProductId}
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

export default connect(mapStateToProps, mapDispatchToProps)(ProductsList);
