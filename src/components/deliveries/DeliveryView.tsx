import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState, DeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import BasicLayout from "../generic/BasicLayout";
import Api, { Product } from "pakkasmarja-client";
import { Divider, Container, Header } from "semantic-ui-react";
import Moment from "react-moment";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
  match?: any
}

/**
 * Interface for component state
 */
interface State {
  deliveryProduct?: DeliveryProduct;
}

class DeliveryView extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {

    };
  }

  /**
   * Component did mount life-sycle event
   */
  async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const products: Product[] = await productsService.listProducts();

    const deliveryId: string = this.props.match.params.deliveryId;
    deliveriesService.findDelivery(deliveryId).then((delivery) => {
      const deliveryProduct: DeliveryProduct = {
        delivery: delivery,
        product: products.find(product => product.id === delivery.productId)
      }
      this.setState({ deliveryProduct });
    });

  }

  render() {
    if (!this.state.deliveryProduct || !this.state.deliveryProduct.product) {
      return <Header>delivery or product not found</Header>;
    }
    return (
      <BasicLayout>
        <Header >
          <h2 style={{ wordWrap: "break-word" }}>{`${this.state.deliveryProduct.product.name} ${this.state.deliveryProduct.product.unitSize} G x ${this.state.deliveryProduct.product.units}`}</h2>
          <Header.Subheader><Moment format="DD.MM.YYYY HH:mm">{this.state.deliveryProduct.delivery.time.toString()}</Moment></Header.Subheader>
        </Header>
        <Divider />
        <Container>
        </Container>
      </BasicLayout>
    );

  }
}

export function mapStateToProps(state: StoreState) {
  return {
    keycloak: state.keycloak
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(DeliveryView);