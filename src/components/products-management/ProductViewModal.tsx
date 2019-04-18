import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Divider, Dimmer, Loader } from "semantic-ui-react";
import Api, { Product } from "pakkasmarja-client";
import BasicLayout from "../generic/BasicLayout";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean,
  closeModal: () => void,
  keycloak?: Keycloak.KeycloakInstance;
  productId: string;

};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean;
  redirect: boolean;
  product?: Product;
  productLoading: boolean;
};

/**
 * Product view delivery modal component class
 */
class ProductViewModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      modalOpen: false,
      redirect: false,
      productLoading: false
    };
  }

  /**
   * Component will receive props life-cycle event
   */
  public async componentWillReceiveProps() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    this.setState({ productLoading: true });
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const product: Product = await productsService.findProduct(this.props.productId);
    this.setState({ product, productLoading: false });
  }

  /**
   * Close modal
   */
  private closeModal = () => {
    this.props.closeModal();
  }

  /**
   * Render method
   */
  public render() {
    if (!this.state.product) {
      return <React.Fragment></React.Fragment>;
    }

    if (this.state.productLoading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan tuotetta
          </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <Modal size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            Toimitus
          </Header>
          <Divider />
          <Header as="h3">Tuotteen nimi </Header><span>{this.state.product.name}</span>
          <Header as="h3">Tuotteen yksikkönimi </Header><span>{this.state.product.unitName}</span>
          <Header as="h3">Tuotteen yksikkömäärä </Header><span>{this.state.product.units}</span>
          <Header as="h3">Tuotteen yksikkökoko </Header><span>{this.state.product.unitSize}</span>
          <Divider style={{ paddingBottom: 0, marginBottom: 0 }} />
          <Button floated="right" onClick={this.closeModal} style={{ marginBottom: 20, marginTop: 20 }} color="black">Sulje</Button>
        </Modal.Content>
      </Modal>
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

export default connect(mapStateToProps, mapDispatchToProps)(ProductViewModal);
