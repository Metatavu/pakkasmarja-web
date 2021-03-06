import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, SortedDeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Item, Grid, Loader, Menu, Button, Modal, Form, Dropdown, DropdownProps, Icon } from "semantic-ui-react";
import "../../styles/common.css";
import ViewModal from "./ViewModal";
import strings from "src/localization/strings";
import BasicLayout from "../generic/BasicLayout";
import Api, { DeliveryQuality, Product } from "pakkasmarja-client";
import * as _ from "lodash";
import * as moment from "moment";
import DatePicker, { registerLocale } from "react-datepicker";
import fi from 'date-fns/esm/locale/fi';
import FileUtils from "src/utils/FileUtils";
import { PDFService } from "src/api/pdf.service";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveries?: DeliveriesState;
  location?: any;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  sortedDeliveriesToGroups?: SortedDeliveryProduct[];
  deliveryId?: string;
  viewModal: boolean;
  pageTitle?: string;
  category?: string;
  deliveryQualities?: DeliveryQuality[];
  deliveryQuality?: DeliveryQuality;
  loading: boolean;
  deliveryProduct?: DeliveryProduct;
  tabActiveItem: "DONE" | "NOT_ACCEPTED";
  raportModal: boolean;
  startDate?: Date,
  endDate?: Date,
  raportProductIds: string[],
  products: Product[]
}

/**
 * Class for past deliveries list component
 */
class PastDeliveries extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      viewModal: false,
      loading: false,
      tabActiveItem: "DONE",
      raportModal: false,
      products: [],
      raportProductIds: []
    };

    registerLocale('fi', fi);
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {

    this.loadData();

  }

  /**
   * Component did update life-sycle event
   */
  public async componentDidUpdate(prevProps: Props, prevState: State) {

    if (prevState.tabActiveItem !== this.state.tabActiveItem) {
      this.loadData();
    }

  }

  /**
   * Load data
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.deliveries) {
      return;
    }
    this.setState({ loading: true });
    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const productsSerivce = await Api.getProductsService(this.props.keycloak.token);
    const products = await productsSerivce.listProducts(undefined, undefined, this.props.keycloak.subject, undefined, 999);
    const category = this.props.location.state ? this.props.location.state.category : "";
    this.setState({ products });
    if (category === "FRESH") {
      const freshDeliveryData: DeliveryProduct[] = this.props.deliveries.freshDeliveryData;
      const freshPastDeliveries: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => deliveryData.delivery.status === this.state.tabActiveItem);
      const sortedDeliveriesToGroups = Array.from(this.sortDeliveryProducts(freshPastDeliveries));
      const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(category);

      this.setState({ sortedDeliveriesToGroups, pageTitle: strings.pastFreshDeliveries, category, deliveryQualities, loading: false });
    }
    if (category === "FROZEN") {
      const frozenDeliveryData: DeliveryProduct[] = this.props.deliveries.frozenDeliveryData;
      const frozenPastDeliveries: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => deliveryData.delivery.status === this.state.tabActiveItem);
      const sortedDeliveriesToGroups = Array.from(this.sortDeliveryProducts(frozenPastDeliveries));
      const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(category);
      this.setState({ sortedDeliveriesToGroups, pageTitle: strings.pastFrozenDeliveries, category, deliveryQualities, loading: false });
    }
  }

  /**
   * Sort delivery products
   * 
   * @param deliveryProductArray deliveryProductArray
   * @returns sorted array
   */
  private sortDeliveryProducts = (deliveryProductArray: DeliveryProduct[]) => {
    const sortedDeliveryProductByDate = _.sortBy(deliveryProductArray, (deliveryProduct) => deliveryProduct.delivery.time).reverse();
    const sorted: ArrayLike<SortedDeliveryProduct> = _.chain(sortedDeliveryProductByDate)
      .groupBy(deliveryProduct => moment(deliveryProduct.delivery.time).format("DD.MM.YYYY"))
      .map((v, i) => {
        return {
          time: i,
          deliveryProducts: v
        }
      }).value();
    return sorted;
  }

  /**
   * Render quality
   */
  private renderQuality = (qualityId: string) => {
    if (!this.state.deliveryQualities) {
      return;
    }
    const quality: DeliveryQuality | undefined = this.state.deliveryQualities.find(quality => quality.id === qualityId);
    return quality &&
      <div style={{ display: "flex", justifyContent: "flex-start", alignContent: "flex-start" }}>
        <div className="delivery-quality-container" style={{ backgroundColor: quality.color || "grey" }}>
          <p style={{ fontWeight: "bold" }}>{quality.displayName.slice(0, 1).toLocaleUpperCase()}</p>
        </div>
        <h4 style={{ margin: "auto", color: quality.color || "black" }} >{quality.displayName}</h4>
      </div>;
  }

  /**
   * Handles item click
   */
  private handleItemClick = (deliveryProduct: DeliveryProduct) => {
    const deliveryQuality = this.state.deliveryQualities!.find((quality) => quality.id === deliveryProduct.delivery.qualityId);
    this.setState({ deliveryId: deliveryProduct.delivery.id, deliveryQuality, deliveryProduct, viewModal: true });
  }

  /**
   * Renders raport modal
   */
  private renderRaportModal = () => {
    return (
      <Modal size="tiny" open={this.state.raportModal} onClose={() => this.setState({ raportModal: false })}>
        <Modal.Header>Lataa yhteenveto raportti tehdyistä toimituksista</Modal.Header>
        <Modal.Content>
          <Form >
            <div style={{ display: "flex", justifyContent: "space-evenly" }}>
              <Form.Field>{this.renderDatePicker("startDate", "Aloituspäivämäärä")}</Form.Field>
              <Form.Field>{this.renderDatePicker("endDate", "Päättymispäivä")}</Form.Field>
            </div>
            <Form.Field>{this.renderMultiSelect()}</Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button color="red" inverted onClick={() => this.setState({ raportModal: false })}>
            <Icon name='remove' />
            Sulje
            </Button>
          <AsyncButton color="green" disabled={ !this.isValid() } onClick={ this.downloadDeliveriesReport }>
            <Icon name='checkmark' />
            Lataa raportti
          </AsyncButton>
        </Modal.Actions>
      </Modal>
    );
  }

  /**
   * Download deliveries report
   */
  private downloadDeliveriesReport = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.startDate || !this.state.endDate) {
      return;
    }
    const pdfService = new PDFService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);

    const startDate = `${moment(this.state.startDate).format("YYYY-MM-DD")}T00:00.000Z`
    const endDate = `${moment(this.state.endDate).format("YYYY-MM-DD")}T23:00.000Z`
    const pdfData: Response = await pdfService.getDeliveryPdf("deliveriesReport", startDate, endDate, this.state.raportProductIds);
    const blob = await pdfData.blob();
    FileUtils.downloadBlob(blob, "application/pdf", `toimitukset.pdf`);

  }

  /**
   * Renders date picker
   */
  private renderDatePicker = (key: "startDate" | "endDate", label: string) => {
    return (
      <React.Fragment>
        <label>{label}<p style={{ display:"inline", color: "red" }}> *</p></label>
        <DatePicker
          dateFormat="dd.MM.yyyy"
          locale="fi"
          onChange={(date: Date) => {
            const state: State = this.state;
            state[key] = date;
            this.setState(state);
          }}
          selected={this.state[key]}
        />
      </React.Fragment>
    );
  }

  /**
   * Renders multi select
   */
  private renderMultiSelect = () => {
    const options = this.state.products.map(product => {
      return { key: product.id, text: product.name, value: product.id };
    });

    return (
      <div style={{ width: "78%", margin: "auto" }}>
        <label style={{ fontWeight: 700 }}>Valitse tuotteet</label>
        <Dropdown onChange={(e, data: DropdownProps) => this.setState({ raportProductIds: data.value as string[] })} placeholder='Valitse tuotteet' fluid multiple selection options={options} />
      </div>
    );
  }

  /**
   * Render method
   */
  public render() {
    const { sortedDeliveriesToGroups } = this.state;
    const { tabActiveItem } = this.state;
    return (
      <BasicLayout pageTitle={this.state.pageTitle}>
        <Grid>
          <Grid.Column width={4}></Grid.Column>
          <Grid.Column width={8}>
            <Menu color="red" pointing secondary widths={2}>
              <Menu.Item name={strings.pastDeliveries} active={tabActiveItem === 'DONE'} onClick={() => this.setState({ tabActiveItem: "DONE" })} />
              <Menu.Item content="Hylätyt toimitukset" active={tabActiveItem === 'NOT_ACCEPTED'} onClick={() => this.setState({ tabActiveItem: "NOT_ACCEPTED" })} />
            </Menu>
          </Grid.Column>
          <Grid.Column width={4}></Grid.Column>
        </Grid>
        {this.state.loading ? <Loader size="medium" content={strings.loading} active /> :
          <Grid verticalAlign='middle'>
            <Grid.Row style={{ padding: "0" }}>
              <Grid.Column width={4}>
              </Grid.Column>
              <Grid.Column width={8}>
                <Button onClick={() => this.setState({ raportModal: true })} color="red" inverted fluid style={{ marginBottom: "14px" }}>Lataa raportti</Button>
                {
                  sortedDeliveriesToGroups && sortedDeliveriesToGroups.map((obj) => {
                    return (
                      <React.Fragment key={obj.deliveryProducts[0].delivery.id}>
                        <div className="delivery-sort-time-container"><h3>Päivämäärä {obj.time}</h3></div>
                        <Item.Group divided>
                          {obj.deliveryProducts.map((deliveryProduct) => {
                            if (!deliveryProduct.product) {
                              return;
                            }
                            return (
                              <Item className="open-modal-element" key={deliveryProduct.delivery.id} onClick={() => this.handleItemClick(deliveryProduct)}>
                                <Item.Content style={{ maxWidth: "65%" }}>
                                  <Item.Header style={{ fontWeight: 500 }}>{`${deliveryProduct.product.name} ${deliveryProduct.delivery.amount} x ${deliveryProduct.product.units} ${deliveryProduct.product.unitName} `}</Item.Header>
                                  <Item.Description>
                                    {`Toimitettu ${moment(deliveryProduct.delivery.time).format("DD.MM.YYYY HH:mm")}`}
                                  </Item.Description>
                                </Item.Content>
                                {deliveryProduct.delivery.qualityId && this.renderQuality(deliveryProduct.delivery.qualityId)}
                              </Item>
                            )
                          })
                          }
                        </Item.Group>
                      </React.Fragment>
                    )
                  })
                }
              </Grid.Column>
              <Grid.Column width={4}>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        }
        <ViewModal
          modalOpen={this.state.viewModal}
          closeModal={() => this.setState({ viewModal: false })}
          deliveryId={this.state.deliveryId || ""}
          deliveryQuality={this.state.deliveryQuality}
          deliveryProduct={this.state.deliveryProduct}
        />
        {this.renderRaportModal()}
      </BasicLayout>
    );
  }

  /**
   * Returns whether form is valid or not
   * 
   * @return whether form is valid or not
   */
  private isValid = () => {
    return !!(
      this.state.startDate
      && this.state.endDate
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
    keycloak: state.keycloak,
    deliveries: state.deliveries
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

export default connect(mapStateToProps, mapDispatchToProps)(PastDeliveries);
