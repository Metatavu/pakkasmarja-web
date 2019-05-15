import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import Api, { DeliveryPlace, Product, Contact, Delivery } from "pakkasmarja-client";
import { Dimmer, Loader, Dropdown, DropdownProps, Modal, Button, Input, Image} from "semantic-ui-react";
import { Table } from 'semantic-ui-react';
import BasicLayout from "../generic/BasicLayout";
import * as moment from "moment";
import TableBasicLayout from "../contract-management/TableBasicLayout";
import ManageDeliveryModal from "./ManageDeliveryModal";
import DatePicker, { registerLocale } from "react-datepicker";
import fi from 'date-fns/esm/locale/fi'
import IncomingDeliveryIcon from "../../gfx/incoming-delivery-icon.png";

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
  contacts: Contact[],
  deliveries: Delivery[],
  selectedDeliveryPlaceId?: string
  selectedDelivery?: Delivery
  proposalProduct?: Product
  proposalContact?: Contact
  proposalAmount?: number
  addingProposal: boolean
}

/**
 * Class for itemgroups list component
 */
class FreshDeliveryManagement extends React.Component<Props, State> {

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
      contacts: [],
      deliveries: [],
      selectedDate: new Date(),
      addingProposal: false
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

    this.setState({ loading: true });
    const deliveryPlaces = await Api.getDeliveryPlacesService(keycloak.token).listDeliveryPlaces();
    const products = await Api.getProductsService(keycloak.token).listProducts(undefined, "FRESH");
    const contacts = await Api.getContactsService(keycloak.token).listContacts();

    this.setState({ 
      loading: false,
      deliveryPlaces: deliveryPlaces,
      products: products,
      contacts: contacts
    });
  }

  public async componentDidUpdate(prevProps: Props, prevState: State) {
    const { selectedDeliveryPlaceId, selectedDate } = this.state;
    const isSameDay = moment(selectedDate).isSame(prevState.selectedDate, "day");
    if (selectedDeliveryPlaceId && ((selectedDeliveryPlaceId != prevState.selectedDeliveryPlaceId) || !isSameDay)) {
      this.updateTableData();
    }
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading) {
      return (
        <BasicLayout pageTitle="Päiväennuste, tuoreet">
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


    const {contacts, products} = this.state;

    const productHeaderCells = products.map((product) => {
      return (
        <Table.HeaderCell key={product.id}>{product.name}</Table.HeaderCell>
      );
    });

    const tableRows: JSX.Element[] = [];
    for(let i = 0; i < contacts.length; i++) {
      let tableCells: JSX.Element[] = [];
      let contact = contacts[i];
      tableCells.push(<Table.Cell>{contact.displayName}</Table.Cell>);
      for(let j = 0; j < products.length; j++) {
        let product = products[j];
        let delivery = this.findDeliveryByContactAndProduct(contact, product);
        if (!delivery) {
          tableCells.push(
            <Table.Cell 
              key={`${contact.id}-${product.id}`}
              selectable
              onClick={() => this.handleCreateDelivery(contact, product)} />
          );
        } else {
          const textStyle = this.getDeliveryTextStyle(delivery);

          tableCells.push(
            <Table.Cell 
              key={`${contact.id}-${product.id}`}
              style={{...textStyle}}
              selectable
              onClick={() => this.handleEditDelivery(delivery!)}>
              { this.renderDeliveryIcon(delivery) }
              { delivery.amount }
            </Table.Cell>
          );
        }
      }
      tableRows.push(<Table.Row key={contact.id}>{tableCells}</Table.Row>)
    }

    return (
      <TableBasicLayout pageTitle="Päiväennuste, tuoreet">
        <Dropdown
          placeholder="Toimituspaikka"
          options={deliveryPlaceOptions}
          value={this.state.selectedDeliveryPlaceId}
          search
          onChange={this.handleDeliveryPlaceChange}
        />
        <br/><br/><br/>
        <DatePicker
          onChange={(date: Date) => {
            this.setState({
              selectedDate: date
            });
          }}
          selected={this.state.selectedDate}
          locale="fi"
        />
        {this.state.selectedDeliveryPlaceId &&
          <Table celled padded>
            <Table.Header>
              <Table.Row>
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
            onUpdate={() => { this.setState({selectedDelivery: undefined}); this.updateTableData();} }
            onClose={() => this.setState({selectedDelivery: undefined})}
            open={true}
            delivery={this.state.selectedDelivery} />
        }
        {this.state.proposalContact && this.state.proposalProduct &&
          <Modal size="tiny" open={true} onClose={() => this.setState({proposalContact: undefined, proposalProduct: undefined})}>
            <Modal.Header>Luo toimitusehdotus</Modal.Header>
            <Modal.Content>
              <p>Syötä ehdotettava määrä</p>
              <Input value={this.state.proposalAmount} type="number" onChange={(e, data) => {this.setState({proposalAmount: parseInt(data.value, 10)})}} />
            </Modal.Content>
            <Modal.Actions>
              <Button onClick={() => this.setState({proposalContact: undefined, proposalProduct: undefined})} negative>Peruuta</Button>
              <Button onClick={() => this.addProposal()} loading={this.state.addingProposal} positive icon='checkmark' labelPosition='right' content='Tee ehdotus' />
            </Modal.Actions>
          </Modal>
        }
      </TableBasicLayout>
    );
  }

  /**
   * Renders delivery icon
   * 
   * @param delivery delivery
   */
  private renderDeliveryIcon(delivery: Delivery) {
    const icon = this.getDeliveryIcon(delivery);
    if (!icon) {
      return null;
    }

    return <Image src={ icon } style={{ float: "left", maxWidth: "32px", marginRight: "10px" }}/>
  }

  private addProposal = async () => {
    const { keycloak } = this.props;
    const { proposalContact, proposalProduct, proposalAmount, selectedDeliveryPlaceId, selectedDate } = this.state;
    if (!keycloak || !keycloak.token || !proposalContact || !proposalAmount || !proposalProduct || !proposalAmount || !selectedDeliveryPlaceId) {
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
      userId: proposalContact.id!
    });

    this.setState({
      addingProposal: false,
      proposalAmount: undefined,
      proposalContact: undefined,
      proposalProduct: undefined
    });

    this.updateTableData();
  }

  /**
   * Returns delivery icon
   * 
   * @param delivery delivery
   */
  private getDeliveryIcon(delivery: Delivery) {
    switch (delivery.status) {
      case "DELIVERY":
        return IncomingDeliveryIcon;
      case "DONE":
      case "PROPOSAL":
      case "PLANNED":
      case "REJECTED":
    }

    return null;
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
        return { color: "#ff0000", paddingLeft: "20px" };
    }
  }

  private findDeliveryByContactAndProduct = (contact: Contact, product: Product): Delivery | undefined => {
    const { deliveries } = this.state;
    return (deliveries || []).find((delivery) => delivery.productId == product.id && delivery.userId == contact.id);
  }

  private handleDeliveryPlaceChange = (event: React.SyntheticEvent<HTMLElement>, data: DropdownProps) => {
    this.setState({
      selectedDeliveryPlaceId: data.value as string
    });
  }

  private updateTableData = async() => {
    const { keycloak } = this.props;
    const { selectedDeliveryPlaceId, selectedDate } = this.state;
    if (selectedDeliveryPlaceId  && keycloak && keycloak.token) {
      this.setState({loading: true});
      const timeBefore = moment(selectedDate).endOf("day").toDate();
      const timeAfter = moment(selectedDate).startOf("day").toDate()
      const deliveries = await Api.getDeliveriesService(keycloak.token).listDeliveries(
        undefined,
        undefined,
        "FRESH",
        undefined,
        undefined,
        selectedDeliveryPlaceId,
        timeBefore,
        timeAfter );

      this.setState({loading: false, deliveries: deliveries});
    }
  }

  private handleCreateDelivery = (contact: Contact, product: Product) => {
    this.setState({
      proposalContact: contact,
      proposalProduct: product
    });
  }

  private handleEditDelivery = (delivery: Delivery) => {
    this.setState({
      selectedDelivery: delivery
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

export default connect(mapStateToProps, mapDispatchToProps)(FreshDeliveryManagement);
