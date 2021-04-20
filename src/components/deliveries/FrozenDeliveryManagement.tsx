import * as _ from "lodash";
import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { DeliveryPlace, Product, Contact, Delivery, DeliveryQuality } from "pakkasmarja-client";
import { Dimmer, Loader, Dropdown, DropdownProps, Modal, Button, Input, Image, Icon, Popup, Form } from "semantic-ui-react";
import { Table } from 'semantic-ui-react';
import BasicLayout from "../generic/BasicLayout";
import * as moment from "moment";
import TableBasicLayout from "../contract-management/TableBasicLayout";
import ManageDeliveryModal from "./ManageDeliveryModal";
import DatePicker, { registerLocale } from "react-datepicker";
import fi from 'date-fns/esm/locale/fi'
import IncomingDeliveryIcon from "../../gfx/incoming-delivery-icon.png";
import "./styles.css"
import CreateDeliveryModal from "./CreateDeliveryModal";
import AsyncButton from "../generic/asynchronous-button";

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
  selectedDate: Date
  loading: boolean
  deliveryPlaces: DeliveryPlace[]
  products: Product[],
  deliveries: Delivery[],
  selectedDeliveryPlaceId?: string
  selectedDelivery?: Delivery
  proposalProduct?: Product
  proposalContactId?: string
  proposalAmount?: number
  addingProposal: boolean,
  contacts: Contact[]
  deliveryQualities: { [key: string]: DeliveryQuality },
  newDeliveryModalOpen: boolean,
  error?: string
}

/**
 * Class for itemgroups list component
 */
class FrozenDeliveryManagement extends React.Component<Props, State> {

  private pollInterval: any;

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      deliveryPlaces: [],
      products: [],
      deliveries: [],
      contacts: [],
      selectedDate: new Date(),
      addingProposal: false,
      deliveryQualities: {},
      newDeliveryModalOpen: false
    };
    registerLocale('fi', fi);
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return;
    }
    const tokenParsed = keycloak.tokenParsed as any;
    const receiveFromPlaceCode = tokenParsed.receiveFromPlaceCode;
    this.setState({ loading: true });
    let deliveryPlaces = await Api.getDeliveryPlacesService(keycloak.token).listDeliveryPlaces();
    const products = await Api.getProductsService(keycloak.token).listProducts(undefined, "FROZEN", undefined, 0, 999);
    const deliveryQualities = await Api.getDeliveryQualitiesService(keycloak.token).listDeliveryQualities("FROZEN");

    if(receiveFromPlaceCode){
      deliveryPlaces= deliveryPlaces.filter( deliveryPlace => deliveryPlace.id === receiveFromPlaceCode);

      if(deliveryPlaces.length === 1){
        this.setState({ selectedDeliveryPlaceId : receiveFromPlaceCode});
      }
      
    }

    this.setState({
      loading: false,
      deliveryPlaces: deliveryPlaces,
      products: products,
      deliveryQualities: _.keyBy(deliveryQualities, "id")
    });

    this.pollInterval = setInterval(() => {
      return this.reloadDeliveries();
    }, 10000);
  }

  /**
   * Component will unmount life-sycle event
   */
  public componentWillUnmount = async () => {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  public async componentDidUpdate(prevProps: Props, prevState: State) {
    const { selectedDeliveryPlaceId, selectedDate } = this.state;
    const isSameDay = moment(selectedDate).isSame(prevState.selectedDate, "day");
    if (selectedDeliveryPlaceId && ((selectedDeliveryPlaceId != prevState.selectedDeliveryPlaceId) || !isSameDay)) {
      this.updateTableData();
    }
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading) {
      return (
        <BasicLayout pageTitle="Päiväennuste, pakasteet">
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan...
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    const deliveryPlaceOptions = this.state.deliveryPlaces.map((deliveryPlace) => {
      return {
        key: deliveryPlace.id,
        value: deliveryPlace.id,
        text: deliveryPlace.name
      }
    });

    const { products, deliveries } = this.state;

    const productHeaderCells = products.map((product) => {
      return (
        <Table.HeaderCell key={product.id}>{product.name}</Table.HeaderCell>
      );
    });

    const morningDeliveries = this.state.deliveries.filter((delivery) => moment(delivery.time).utc().hour() <= 12);
    const eveningDeliveries = this.state.deliveries.filter((delivery) => moment(delivery.time).utc().hour() > 12);

    let tableRows = this.getTableRows(morningDeliveries);
    tableRows.push(this.getTableSummaryRow(morningDeliveries, "Klo 12 mennessä yht."));
    tableRows = tableRows.concat(this.getTableRows(eveningDeliveries));
    tableRows.push(this.getTableSummaryRow(deliveries, "Varastossa nyt", true));
    tableRows.push(this.getTableSummaryRow(deliveries, "Klo 17 mennessä yht."))

    return (
      <TableBasicLayout topBarButtonText={this.state.selectedDeliveryPlaceId ? "+ Uusi toimitus/ehdotus viljelijälle" : undefined} onTopBarButtonClick={this.state.selectedDeliveryPlaceId ? () => this.setState({ newDeliveryModalOpen: true }) : undefined} error={this.state.error} onErrorClose={() => this.setState({ error: undefined })} pageTitle="Päiväennuste, pakasteet">
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ display: "flex", flex: 1, justifyContent: "center", padding: 10, fontSize: "1.5em" }}><p>Valitse toimituspaikka ja päivämäärä</p></div>
          <div style={{ display: "flex", flex: 1, flexDirection: "row" }}>
            <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", marginRight: "0.5%" }}>
              <Dropdown
                selection
                placeholder="Toimituspaikka"
                options={deliveryPlaceOptions}
                value={this.state.selectedDeliveryPlaceId}
                search
                onChange={this.handleDeliveryPlaceChange}
              />
            </div>
            <div style={{ display: "flex", flex: 1, justifyContent: "flex-start", marginLeft: "0.5%" }}>
              <Form>
                <Form.Field>
                  <DatePicker
                    onChange={(date: Date) => {
                      this.setState({
                        selectedDate: date
                      });
                    }}
                    selected={this.state.selectedDate}
                    dateFormat="dd.MM.yyyy"
                    locale="fi"
                  />
                </Form.Field>
              </Form>
            </div>
          </div>
        </div>
        {this.state.selectedDeliveryPlaceId &&
          <Table celled padded selectable>
            <Table.Header>
              <Table.Row className="table-header-row">
                <Table.HeaderCell key="viljelija">Viljelijä</Table.HeaderCell>
                {productHeaderCells}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {tableRows}
            </Table.Body>
          </Table>
        }
        {this.state.selectedDelivery &&
          <ManageDeliveryModal
            onError={this.handleError}
            onUpdate={() => { this.setState({ selectedDelivery: undefined }); this.updateTableData(); }}
            onClose={() => this.setState({ selectedDelivery: undefined })}
            open={true}
            delivery={this.state.selectedDelivery}
            category="FROZEN"
          />
        }
        {this.state.proposalContactId && this.state.proposalProduct &&
          <Modal size="tiny" open={true} onClose={() => this.setState({ proposalContactId: undefined, proposalProduct: undefined })}>
            <Modal.Header>Luo toimitus/ehdotus</Modal.Header>
            <Modal.Content>
              <p>Syötä ehdotettava määrä</p>
              <Input value={this.state.proposalAmount} type="number" onChange={(e, data) => { this.setState({ proposalAmount: parseInt(data.value, 10) }) }} />
            </Modal.Content>
            <Modal.Actions>
              <Button onClick={() => this.setState({ proposalContactId: undefined, proposalProduct: undefined })} negative>Peruuta</Button>
              <AsyncButton onClick={ this.addProposal } loading={ this.state.addingProposal } positive icon='checkmark' labelPosition='right' content='Tee ehdotus' />
            </Modal.Actions>
          </Modal>
        }
        {this.state.selectedDeliveryPlaceId &&
          <CreateDeliveryModal
            selectedDate={ this.state.selectedDate }
            deliveryPlaces={ this.state.deliveryPlaces }
            open={this.state.newDeliveryModalOpen}
            onClose={(created?: boolean) => {
              this.setState({ newDeliveryModalOpen: false });
              if (created) {
                this.reloadDeliveries();
              }
            }}
            deliveryPlaceId={this.state.selectedDeliveryPlaceId}
            category={"FROZEN"}
          />
        }
      </TableBasicLayout>
    );
  }

  private getTableRows(deliveries: Delivery[], initialIndex?: number) {

    const { products } = this.state;

    const tableRows: JSX.Element[] = [];
    let index = initialIndex || 0;
    const contactIds = _.uniq(deliveries.map(delivery => delivery.userId));
    for (let i = 0; i < contactIds.length; i++) {
      index++;
      let tableCells: JSX.Element[] = [];
      let contactId = contactIds[i];
      let contact = this.getContact(contactId);
      tableCells.push(<Table.Cell key={`${index}-${contactId}`}>{contact ? contact.displayName : <Loader size="mini" inline />}</Table.Cell>);
      for (let j = 0; j < products.length; j++) {
        let product = products[j];
        const productDeliveries = this.listContactDeliveries(contactId, product, deliveries);
        if (!productDeliveries.length) {
          tableCells.push(
            <Table.Cell
              key={`${index}-${contactId}-${product.id}`}
              selectable
              onClick={() => this.handleCreateDelivery(contactId, product)} />
          );
        } else {
          if (productDeliveries.length > 1) {
            const deliveryButtons = productDeliveries.map((delivery) => {
              return <Button key={delivery.id} basic onClick={() => this.handleEditDelivery(delivery!)}> {delivery.amount} ({this.getDeliveryStatusText(delivery)}) </Button>
            });

            tableCells.push(
              <Table.Cell key={`${index}-${contactId}-${product.id}`} style={{ paddingLeft: "5px", paddingRight: "5px" }} selectable onClick={() => { }}>
                <Popup style={{ textAlign: "center", whiteSpace: "nowrap" }} wide trigger={<Button style={{ width: "100%" }} basic content='Valitse' />} on='click'>
                  {deliveryButtons}
                </Popup>
              </Table.Cell>
            );
          } else {
            const delivery = productDeliveries[0];
            const textStyle = this.getDeliveryTextStyle(delivery);
            tableCells.push(
              <Table.Cell
                key={`${index}-${contactId}-${product.id}`}
                style={{ ...textStyle }}
                selectable
                onClick={() => this.handleEditDelivery(delivery!)}>
                {this.renderDeliveryIcon(delivery)}
                {delivery.amount}
              </Table.Cell>
            );
          }
        }
      }
      tableRows.push(<Table.Row key={`${index}-${contactId}`}>{tableCells}</Table.Row>)
    }

    return tableRows;
  }

  private getTableSummaryRow(deliveries: Delivery[], headerText: string, onlyDelivered?: boolean) {

    const { products } = this.state;
    let tableCells: JSX.Element[] = [];
    tableCells.push(<Table.Cell key={headerText}>{headerText}</Table.Cell>);
    for (let j = 0; j < products.length; j++) {
      let product = products[j];
      tableCells.push(
        <Table.Cell key={`${headerText}-summary-cell-${product.id}`} style={{ paddingLeft: "5px", paddingRight: "5px" }} selectable onClick={() => { }}>
          {this.countDeliveryAmountByProduct(deliveries, product, onlyDelivered)}
        </Table.Cell>
      );
    }

    return (<Table.Row className={onlyDelivered ? "summary-delivered-row" : "summary-total-row"} key={`${headerText}-summary-row`}>{tableCells}</Table.Row>);
  }

  private countDeliveryAmountByProduct(deliveries: Delivery[], product: Product, onlyDelivered?: boolean) {
    let count = 0;

    const validDeliveries = deliveries.filter( delivery => delivery.status !== "REJECTED" && delivery.status !== "NOT_ACCEPTED");
    validDeliveries.forEach((delivery) => {
      if (delivery.productId === product.id) {
        if (onlyDelivered) {
          if (delivery.status === "DONE") {
            count += delivery.amount;
          }
        } else {
          count += delivery.amount;
        }
      }
    });

    return count;
  }

  private getContact(contactId: string) {
    const contact = this.state.contacts.find((contact) => contact.id === contactId);
    if (contact) {
      return contact;
    }

    this.loadContact(contactId);
    return undefined;
  }

  private loadContact = async (contactId: string) => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return undefined;
    }

    const contact = await Api.getContactsService(keycloak.token).findContact(contactId);
    const currentContacts = [...this.state.contacts];
    currentContacts.push(contact);
    this.setState({
      contacts: currentContacts
    });

    return contact;
  }

  /**
   * Renders delivery icon
   * 
   * @param delivery delivery
   */
  private renderDeliveryIcon(delivery: Delivery) {
    if (delivery.status == "DELIVERY") {
      return <Image src={IncomingDeliveryIcon} style={{ float: "left", maxWidth: "32px", marginRight: "10px" }} />
    }

    if (delivery.qualityId) {
      const deliveryQuality = this.state.deliveryQualities[delivery.qualityId];
      return <Icon size="small" style={{ color: deliveryQuality ? deliveryQuality.color : "#000" }} name="circle" />
    }

    return null;
  }

  /**
   * Returns delivery status text
   */
  private getDeliveryStatusText = (delivery: Delivery) => {
    switch (delivery.status) {
      case "DELIVERY":
        return "Toimituksessa";
      case "DONE":
        return "Hyväksytty";
      case "PLANNED":
        return "Suunnitelma";
      case "PROPOSAL":
        return "Ehdotus";
      case "REJECTED":
        return "Hylätty";
      case "NOT_ACCEPTED":
        return "Toimitus hylättiin pakkasmarjan toimesta";
    }
  }

  private addProposal = async () => {
    const { keycloak } = this.props;
    const { proposalContactId, proposalProduct, proposalAmount, selectedDeliveryPlaceId, selectedDate } = this.state;
    if (!keycloak || !keycloak.token || !proposalContactId || !proposalAmount || !proposalProduct || !proposalAmount || !selectedDeliveryPlaceId) {
      return;
    }

    this.setState({
      addingProposal: true
    });

    await Api.getDeliveriesService(keycloak.token).createDelivery({
      amount: proposalAmount,
      deliveryPlaceId: selectedDeliveryPlaceId,
      productId: proposalProduct.id!,
      status: "PROPOSAL",
      time: selectedDate,
      userId: proposalContactId!
    });

    this.setState({
      addingProposal: false,
      proposalAmount: undefined,
      proposalContactId: undefined,
      proposalProduct: undefined
    });

    this.updateTableData();
  }

  /**
   * Returns style for delivery
   * 
   * @param delivery delivery
   */
  private getDeliveryTextStyle(delivery: Delivery) {
    switch (delivery.status) {
      case "DELIVERY":
        return { color: "#000", paddingLeft: "20px" };
      case "DONE":
        return { color: "#4bb543", paddingLeft: "20px" };
      case "PROPOSAL":
      case "PLANNED":
        return { color: "#aaa", paddingLeft: "20px" };
      case "REJECTED":
      case "NOT_ACCEPTED":
        return { color: "#ff0000", paddingLeft: "20px" };
    }
  }

  /**
   * Lists contact deliveries by product
   * 
   * @param contact contact
   * @param product product
   */
  private listContactDeliveries(contactId: string, product: Product, deliveries: Delivery[]): Delivery[] {
    return (deliveries || []).filter((delivery) => delivery.productId == product.id && delivery.userId == contactId);
  }

  private handleDeliveryPlaceChange = (event: React.SyntheticEvent<HTMLElement>, data: DropdownProps) => {
    this.setState({
      selectedDeliveryPlaceId: data.value as string
    });
  }

  /**
   * Refreshes deliveries from the server. Method does not show operation to the user
   */
  private reloadDeliveries = async () => {
    const { keycloak } = this.props;
    if (keycloak && keycloak.token && !this.state.loading) {
      const deliveries = await this.loadDeliveries(keycloak.token);
      this.setState({ deliveries: deliveries });
    }
  }

  /**
   * Loads delieries from the server
   * 
   * @param token access token
   */
  private loadDeliveries = (token: string) => {
    const { selectedDeliveryPlaceId, selectedDate } = this.state;

    const timeBefore = moment(selectedDate).endOf("day").toDate();
    const timeAfter = moment(selectedDate).startOf("day").toDate();

    return Api.getDeliveriesService(token).listDeliveries(
      undefined,
      undefined,
      "FROZEN",
      undefined,
      undefined,
      selectedDeliveryPlaceId,
      timeBefore,
      timeAfter,
      0,
      9999);
  }

  /**
   * Updates table data and shows a loading screen 
   */
  private updateTableData = async () => {
    const { keycloak } = this.props;
    const { selectedDeliveryPlaceId } = this.state;
    if (selectedDeliveryPlaceId && keycloak && keycloak.token) {
      this.setState({ loading: true });
      const deliveries = await this.loadDeliveries(keycloak.token);

      this.setState({ loading: false, deliveries: deliveries });
    }
  }

  private handleCreateDelivery = (contactId: string, product: Product) => {
    this.setState({
      proposalContactId: contactId,
      proposalProduct: product
    });
  }

  private handleEditDelivery = (delivery: Delivery) => {
    this.setState({
      selectedDelivery: delivery
    });
  }

  /**
   * Handles error from components
   * 
   * @param msg error message
   */
  private handleError = (msg: string) => {
    this.setState({
      error: msg
    });
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

export default connect(mapStateToProps, mapDispatchToProps)(FrozenDeliveryManagement);
