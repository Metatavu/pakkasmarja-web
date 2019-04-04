import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import ErrorMessage from "../generic/ErrorMessage";
import Api, { Contact, ItemGroup, Contract, DeliveryPlace } from "pakkasmarja-client";
import { Button, Header, Divider, Grid, Container } from "semantic-ui-react";
import { Redirect } from "react-router";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
}

/**
 * Interface for component state
 */
interface State {
  errorMessage?: string;
  contract?: Contract;
  deliveryPlace: DeliveryPlace;
  contact: Contact;
  itemGroup: ItemGroup;
  redirect: boolean;
}

/**
 * Class for watch contract component
 */
class WatchContract extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      deliveryPlace: {},
      itemGroup: {},
      contact: {},
      redirect: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    await this.loadContract();
    await this.loadContact();
    await this.loadItemGroup();
    await this.loadDeliveryPlace();
  }

  /**
   * Load contract
   */
  private loadContract = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contractId: string = this.props.match.params.contractId;

    const contactsService = await Api.getContractsService(this.props.keycloak.token);
    const contract: Contract = await contactsService.findContract(contractId, "application/json");
    this.setState({ contract });
  }

  /**
   * Load contacts
   */
  private loadContact = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    const contactsService = await Api.getContactsService(this.props.keycloak.token);
    const contact = await contactsService.findContact(this.state.contract.contactId || "");
    this.setState({ contact });
  }

  /**
   * Load item groups
   */
  private loadItemGroup = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroup = await itemGroupsService.findItemGroup(this.state.contract.itemGroupId || "");
    this.setState({ itemGroup });
  }

  /**
   * Load delivery places
   */
  private loadDeliveryPlace = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryPlace = await deliveryPlacesService.findDeliveryPlace(this.state.contract.deliveryPlaceId || "");
    this.setState({ deliveryPlace });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.errorMessage) {
      return (
        <BasicLayout>
          <ErrorMessage
            errorMessage={this.state.errorMessage || ""}
          />
        </BasicLayout>
      );
    }

    if (this.state.redirect) {
      return (
        <Redirect to="/contractManagement" />
      );
    }

    return (
      <BasicLayout>
        <Divider horizontal>
          <Header as='h2'>
            {`${this.state.contact.companyName || "Kontaktia ei löytynyt"} - ${this.state.itemGroup.name || "Tuoteryhmää ei löytynyt"}`}
          </Header>
        </Divider>
        {
          this.state.contract &&
          <Container text>
            <Grid celled='internally'>
              <Grid.Row>
                <Grid.Column width={4}>
                  <p>Marjalaji:</p>
                </Grid.Column>
                <Grid.Column width={12}>
                  <p>{this.state.itemGroup.displayName}</p>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column width={4}>
                  <p>SapId:</p>
                </Grid.Column>
                <Grid.Column width={12}>
                  <p>{this.state.contract.sapId}</p>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column width={4}>
                  <p>Tila:</p>
                </Grid.Column>
                <Grid.Column width={12}>
                  <p>{this.state.contract.status}</p>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column width={4}>
                  <p>Määrä:</p>
                </Grid.Column>
                <Grid.Column width={12}>
                  <p>{this.state.contract.contractQuantity}</p>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column width={4}>
                  <p>Määrän kommentti:</p>
                </Grid.Column>
                <Grid.Column width={12}>
                  <p>{this.state.contract.quantityComment}</p>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column width={4}>
                  <p>Toimituspaikka:</p>
                </Grid.Column>
                <Grid.Column width={12}>
                  <p>{this.state.deliveryPlace.name}</p>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column width={4}>
                  <p>Toimituspaikan kommentti:</p>
                </Grid.Column>
                <Grid.Column width={12}>
                  <p>{this.state.contract.deliveryPlaceComment}</p>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column width={4}>
                  <p>Huomautuskenttä (SAP):</p>
                </Grid.Column>
                <Grid.Column width={12}>
                  <p>{this.state.contract.remarks}</p>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </Container>
        }
        <Button floated="right" color="red" onClick={() => this.setState({ redirect: true })}>Takaisin</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(WatchContract);