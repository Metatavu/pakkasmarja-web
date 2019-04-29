import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState, WeekDeliveryPredictionTableData } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Divider } from "semantic-ui-react";
import { WeekDeliveryPredictionDays } from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean,
  closeModal: () => void,
  keycloak?: Keycloak.KeycloakInstance;
  data?: WeekDeliveryPredictionTableData;
};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean;
  redirect: boolean;
};

/**
 * Week delivery prediction view modal component class
 */
class WeekDeliveryPredictionViewModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      modalOpen: false,
      redirect: false
    };
  }

  /**
   * Close modal
   */
  private closeModal = () => {
    this.props.closeModal();
  }

  /**
   * Get delivery days
   * 
   * @returns localized day name in a string
   */
  private getDeliveryDays = (): string => {
    const days: WeekDeliveryPredictionDays = this.props.data && { ... this.props.data.weekDeliveryPrediction.days } || {};
    const keys = Object.keys(days);
    const filtered = keys.filter((key) => {
      return days[key]
    });
    const localized = filtered.map((label) => this.localizeDayName(label));
    return localized.join(", ");
  }

  /**
   * Return localized day name
   * 
   * @param dayname dayname
   * @returns label
   */
  private localizeDayName = (dayname: string) => {
    switch (dayname) {
      case 'monday':
        return 'Maanantai';
      case 'tuesday':
        return 'Tiistai';
      case 'wednesday':
        return 'Keskiviikko';
      case 'thursday':
        return 'Torstai';
      case 'friday':
        return 'Perjantai';
      case 'saturday':
        return 'Lauantai';
      case 'sunday':
        return 'Sunnuntai';
      default:
        return '';
    }
  }

  /**
   * Render method
   */
  public render() {
    if (!this.props.data) {
      return (
        <Modal size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
          <Modal.Content>
            <Header as="h3">
              {strings.weekDeliveryNotFound}
            </Header>
            <Button floated="right" onClick={this.closeModal} style={{ marginBottom: 20, marginTop: 20 }} color="black">
              {strings.close}
            </Button>
          </Modal.Content>
        </Modal>
      );
    }

    return (
      <Modal size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            {`${this.props.data.itemGroup.displayName} ${this.props.data.weekDeliveryPrediction.amount} KG - viikko ${this.props.data.weekDeliveryPrediction.weekNumber}`}
          </Header>
          <Divider />
          <p><b>{strings.product}</b> - {this.props.data.itemGroup.name}</p>
          <p><b>{strings.amount}</b> - {this.props.data.weekDeliveryPrediction.amount}</p>
          <p><b>{strings.deliveryDays}</b> - {this.getDeliveryDays()}</p>
          <Divider style={{ paddingBottom: 0, marginBottom: 0 }} />
          <Button floated="right" onClick={this.closeModal} style={{ marginBottom: 10, marginTop: 10 }} color="black">
            {strings.close}
          </Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(WeekDeliveryPredictionViewModal);
