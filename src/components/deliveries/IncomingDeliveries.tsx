import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, SortedDeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Header, Item, Button, Grid, Image, Modal, Checkbox, Loader } from "semantic-ui-react";
import { Link, Redirect } from "react-router-dom";
import "../../styles/common.css";
import ViewModal from "./ViewModal";
import Api, { Product } from "pakkasmarja-client";
import strings from "src/localization/strings";
import BasicLayout from "../generic/BasicLayout";
import InDeliveryIcon from "../../gfx/indelivery_logo.png";
import PakkasmarjaRedLogo from "../../gfx/red_logo.png";
import * as _ from "lodash";
import * as moment from "moment";
import AsyncButton from "../generic/asynchronous-button";
import AppConfig from "src/utils/AppConfig";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveries?: DeliveriesState;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
  location?: any;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  sortedDeliveriesByTime?: SortedDeliveryProduct[];
  viewModal: boolean;
  deliveryId?: string;
  redirect: boolean;
  pageTitle?: string;
  category?: string;
  redirectTo?: string;
  deliveryProduct?: DeliveryProduct;
  confirmRemove: boolean;
  deliveryDescription: string;
  confirmBeginDelivery: boolean;
  confirmValidDelivery: boolean;
  isOrganicProduct?: boolean;
  confirmOrganicProduct: boolean;
}

/**
 * Class for incoming deliveries component
 */
class IncomingDeliveries extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      viewModal: false,
      redirect: false,
      confirmRemove: false,
      confirmBeginDelivery: false,
      deliveryDescription: "",
      confirmValidDelivery: false,
      confirmOrganicProduct: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public componentDidMount() {
    this.loadData();
  }

  /**
   * Load data
   */
  private loadData = () => {
    const { keycloak, deliveries, location } = this.props;

    if (!keycloak?.token || !deliveries) {
      return;
    }
    const category = location.state?.category || "";
    const filterCondition = [ "PROPOSAL", "PLANNED", "DELIVERY" ];

    if (category === "FRESH") {
      const freshDeliveries = deliveries.freshDeliveryData.filter(deliveryData =>
        filterCondition.includes(deliveryData.delivery.status)
      );

      this.setState({
        sortedDeliveriesByTime: this.sortDeliveryProducts(freshDeliveries),
        category: category,
        pageTitle: strings.freshDeliveries
      });

      return;
    }

    if (category === "FROZEN") {
      const frozenDeliveries = deliveries.frozenDeliveryData.filter(deliveryData =>
        filterCondition.includes(deliveryData.delivery.status)
      );

      this.setState({
        sortedDeliveriesByTime: this.sortDeliveryProducts(frozenDeliveries),
        category: category,
        pageTitle: strings.frozenDeliveries
      });
    }
  }

  /**
   * Sort delivery products
   *
   * @param deliveryProductArray deliveryProductArray
   * @returns sorted array
   */
  private sortDeliveryProducts = (deliveryProductArray: DeliveryProduct[]) => {
    const sortedDeliveryProductByDate = _.sortBy(deliveryProductArray, deliveryProduct => deliveryProduct.delivery.time).reverse();
    const sortedToGroups: ArrayLike<SortedDeliveryProduct> = _.chain(sortedDeliveryProductByDate)
      .groupBy(deliveryProduct => moment(deliveryProduct.delivery.time).format("DD.MM.YYYY"))
      .map((v, i) => ({ time: i, deliveryProducts: _.sortBy(v, deliveryProduct => deliveryProduct.delivery.time) }))
      .value();

    return Array.from(sortedToGroups);
  }

  /**
   * Returns whether product is organic or not
   *
   * @param product product
   */
  private isOrganicProduct = async (product: Product | undefined) => {
    if (!product) return false;

    const appConfig = await AppConfig.getAppConfig() || {};
    const organicProductCodes: number[] | undefined = _.get(appConfig, [ "organic-product-codes" ]);
    const itemCode: number = Number(product.sapItemCode);

    return !!organicProductCodes?.includes(itemCode);
  }

  /**
   * Handle open begin delivery modal
   *
   * @param deliveryProduct delivery product
   */
  private handleOpenBeginDeliveryModal = async (deliveryProduct: DeliveryProduct) => {
    const { product } = deliveryProduct;

    if (product) {
      this.setState({
        deliveryProduct: deliveryProduct,
        confirmBeginDelivery: true,
        confirmValidDelivery: false,
        isOrganicProduct: await this.isOrganicProduct(product)
      });
    }
  }

  /**
   * Returns whether delivery can be started
   */
  private canBeginDelivery = () => {
    const { confirmValidDelivery, isOrganicProduct, confirmOrganicProduct } = this.state;
    return confirmValidDelivery && (!isOrganicProduct || confirmOrganicProduct);
  }

  /**
   * Handles begin delivery
   *
   * @param deliveryProduct delivery product
   */
  private handleBeginDelivery = async (deliveryProduct?: DeliveryProduct) => {
    const { keycloak, deliveriesLoaded } = this.props;

    if (!deliveryProduct) return;

    const {
      id,
      productId,
      time,
      amount,
      deliveryPlaceId
    } = deliveryProduct?.delivery;

    if (!id || !keycloak?.token || !keycloak.subject) return;

    const updateDelivery = await Api
      .getDeliveriesService(keycloak.token)
      .updateDelivery({
        productId: productId,
        userId: keycloak.subject,
        time: time,
        status: "DELIVERY",
        amount: amount,
        price: "0",
        deliveryPlaceId: deliveryPlaceId
      }, id);

    this.setState({ confirmBeginDelivery: false });

    const updatedDeliveries = this.getUpdatedDeliveryData({
      delivery: updateDelivery,
      product: deliveryProduct.product
    });

    deliveriesLoaded?.(updatedDeliveries);

    this.loadData();
  }

  /**
   * Handles remove delivery
   *
   * @param deliveryProduct
   */
  private handleRemoveDelivery = async (deliveryProduct?: DeliveryProduct) => {
    const { keycloak, deliveriesLoaded } = this.props;

    if (!deliveryProduct) return;

    this.setState({ confirmRemove: false });

    const delivery = deliveryProduct.delivery;

    if (!keycloak?.token || !delivery.id) {
      return;
    }

    const updateDelivery = await Api
      .getDeliveriesService(keycloak.token)
      .updateDelivery({ ...delivery, status: "REJECTED" }, delivery.id);

    const updatedDeliveries = this.getUpdatedDeliveryData({
      delivery: updateDelivery,
      product: deliveryProduct.product
    });

    deliveriesLoaded?.(updatedDeliveries);

    this.loadData();
  }

  /**
   * Get updated delivery data
   *
   * @param deliveryProduct deliveryProduct
   */
  private getUpdatedDeliveryData = (deliveryProduct: DeliveryProduct): DeliveriesState => {
    const { deliveries } = this.props;

    if (!deliveries) {
      return {
        frozenDeliveryData: [],
        freshDeliveryData: []
      };
    }

    const modifiedDeliveries = { ...deliveries };

    const freshDeliveries = modifiedDeliveries?.freshDeliveryData?.map(deliveryData => {
      if (deliveryData.delivery.id === deliveryProduct.delivery.id) {
        return {
          delivery: deliveryProduct.delivery,
          product: deliveryProduct.product
        }
      }
      return deliveryData;
    });

    const frozenDeliveries = modifiedDeliveries.frozenDeliveryData?.map(deliveryData => {
      if (deliveryData.delivery.id === deliveryProduct.delivery.id) {
        return {
          delivery: deliveryProduct.delivery,
          product: deliveryProduct.product
        }
      }
      return deliveryData;
    });

    return {
      freshDeliveryData: freshDeliveries || [],
      frozenDeliveryData: frozenDeliveries || []
    };
  }

  /**
   * redirects to another page
   */
  private redirectTo = () => {
    const { category } = this.state;

    this.setState({ redirectTo: `/createDelivery/${category === "FRESH" ? "FRESH" : "FROZEN"}` });
  }

  /**
   * Render method
   */
  public render() {
    const {
      redirectTo,
      sortedDeliveriesByTime,
      pageTitle,
      category,
      viewModal,
      deliveryId,
      deliveryProduct,
      confirmBeginDelivery,
      confirmValidDelivery,
      isOrganicProduct,
      confirmOrganicProduct,
      confirmRemove
    } = this.state;

    if (redirectTo) {
      return <Redirect to={ redirectTo }/>;
    }

    return (
      <BasicLayout
        pageTitle={ pageTitle }
        topBarButtonText={ category === "FRESH" ? strings.createNewFreshDelivery : strings.createNewFrozenDelivery }
        onTopBarButtonClick={ this.redirectTo }
      >
        <Grid>
          <Grid.Row>
            <Grid.Column width={ 3 }>
            </Grid.Column>
            <Grid.Column width={ 10 }>
              { sortedDeliveriesByTime?.map(({ deliveryProducts, time }) => (
                  <React.Fragment key={ deliveryProducts[0].delivery.id }>
                    <div className="delivery-sort-time-container">
                      <h3>Päivämäärä { time }</h3>
                    </div>
                    <Item.Group divided>
                    { deliveryProducts.map(deliveryProduct => {
                        const { delivery, product } = deliveryProduct;

                        if (!product) return;

                        return (
                          <Item key={ delivery.id }>
                            <Item.Content
                              className="open-modal-element"
                              onClick={ () =>
                                this.setState({
                                  deliveryProduct: deliveryProduct,
                                  deliveryId: delivery.id,
                                  viewModal: true
                                })
                              }
                            >
                              <Item.Header style={{ fontWeight: 500 }}>
                                { `${product.name} ${delivery.amount} x ${product.units} ${product.unitName}` }
                              </Item.Header>
                              <Item.Description>
                                { moment(delivery.time).utc().format("[klo] HH.mm") }
                              </Item.Description>
                            </Item.Content>
                            { this.renderStatus(deliveryProduct) }
                          </Item>
                        )
                      })
                    }
                    </Item.Group>
                  </React.Fragment>
                ))
              }
            </Grid.Column>
            <Grid.Column width={ 3 }>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <ViewModal
          modalOpen={ viewModal }
          closeModal={ () => this.setState({ viewModal: false }) }
          deliveryId={ deliveryId || "" }
          deliveryProduct={ deliveryProduct }
        />
        <Modal
          size="tiny"
          open={ confirmBeginDelivery }
        >
          <Modal.Header>
            Aloita toimitus
          </Modal.Header>
            <Modal.Content>
              { isOrganicProduct === undefined &&
                <Loader active/>
              }
              { isOrganicProduct !== undefined &&
                <>
                  <Checkbox
                    checked={ confirmValidDelivery }
                    label="Vakuutan, että toimituksessa mainittujen marjojen alkuperämaa on Suomi ja että liitetty kuva on otettu tämän toimituksen marjoista."
                    onChange={ () => this.setState({ confirmValidDelivery: !confirmValidDelivery }) }
                    style={{ marginBottom: 20 }}
                  />
                  { isOrganicProduct &&
                    <Checkbox
                      checked={ confirmOrganicProduct }
                      label="Vakuutan tämän marjaerän olevan asetuksen (EU) 2018/848 ja komission asetuksen (EY) 889/2008 mukaisesti tuotettu tuote."
                      onChange={ () => this.setState({ confirmOrganicProduct: !confirmOrganicProduct }) }
                    />
                  }
                </>
              }
            </Modal.Content>
          <Modal.Actions>
            <Button.Group>
              <Button
                onClick={ () =>
                  this.setState({ confirmBeginDelivery: false, isOrganicProduct: undefined })
                }
                color="red"
                inverted
              >
                Sulje
              </Button>
              <AsyncButton
                onClick={ () => this.handleBeginDelivery(deliveryProduct) }
                disabled={ !this.canBeginDelivery() }
                positive
                icon="check"
                labelPosition="right"
                content="Aloita toimitus"
              />
            </Button.Group>
          </Modal.Actions>
        </Modal>
        <Modal
          size="tiny"
          open={ confirmRemove }
        >
          <Modal.Header>
            Hylkää toimitus
          </Modal.Header>
          <Modal.Content>
            <p>Haluatko varmasti hylkää toimituksen</p>
          </Modal.Content>
          <Modal.Actions>
            <Button.Group>
              <Button
                onClick={ () => this.setState({ confirmRemove: false }) }
                color="red"
                inverted
              >
                Sulje
              </Button>
              <AsyncButton
                onClick={ () => this.handleRemoveDelivery(deliveryProduct) }
                color="red"
                icon="trash"
                labelPosition="right"
                content="Hylkää toimitus"
              />
            </Button.Group>
          </Modal.Actions>
        </Modal>
      </BasicLayout>
    );
  }

  /**
   * Renders elements depending on delivery status
   *
   * @param deliveryProduct deliveryProduct
   */
  private renderStatus(deliveryProduct: DeliveryProduct) {
    const { category } = this.state;
    const { status } = deliveryProduct.delivery;

    if (status === "PROPOSAL") {
      return (
        <>
          <Image
            src={ PakkasmarjaRedLogo }
            style={{
              float: "left",
              margin: "auto",
              maxHeight: "28px",
              maxWidth: "28px",
              marginRight: "17px"
            }}
          />
          <Header
            style={{ margin: "auto", marginRight: 35 }}
            color="red"
            as="h4"
          >
            Ehdotuksissa
          </Header>
        </>
      );
    }

    if (status === "DELIVERY") {
      return (
        <>
          <Image
            src={ InDeliveryIcon }
            style={{
              float: "left",
              margin: "auto",
              maxHeight: "21px",
              maxWidth: "35px",
              marginRight: "10px"
            }}
          />
          <Header
            style={{ margin: "auto", marginRight: 30 }}
            color="green"
            as="h4"
          >
            Toimituksessa
          </Header>
        </>
      );
    }

    if (status === "PLANNED") {
      return (
        <Button.Group
          floated="right"
          style={{ maxHeight: "37px" }}
        >
          <Button
            as={ Link }
            to={ `/editDelivery/${category || ""}/${deliveryProduct.delivery.id}` }
            color="red"
          >
            Muokkaa
          </Button>
          <Button.Or text="" />
          <Button
            onClick={ () => this.handleOpenBeginDeliveryModal(deliveryProduct) }
            color="green"
          >
            Aloita toimitus
          </Button>
          <Button
            icon="trash alternate"
            onClick={ () => this.setState({ deliveryProduct, confirmRemove: true }) }
            color="black"
          />
        </Button.Group>
      );
    }

    return null;
  }
}

/**
 * Redux mapper for mapping store state to component props
 *
 * @param state store state
 */
function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak,
    deliveries: state.deliveries
  }
}

/**
 * Redux mapper for mapping component dispatches
 *
 * @param dispatch dispatch method
 */
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(IncomingDeliveries);
