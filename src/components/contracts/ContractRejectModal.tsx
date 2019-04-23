import * as React from "react";
import * as actions from "../../actions/";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { StoreState } from "../../types";
import { Button, Modal, Form, TextArea } from 'semantic-ui-react'
import { Contract } from "pakkasmarja-client";
import Api from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance,
  modalOpen: boolean,
  closeModal: () => void,
  rejectComment: string,
  onUserInputChange: (key: any, value: any) => void,
  contractRejected: () => void,
  contract?: Contract,
};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean,
};

/**
 * Contract reject modal component class
 */
class ContractRejectModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      modalOpen: false
    };
  }

  /**
   * Close modal
   */
  private closeModal = () => {
    this.props.closeModal();
  }

  /**
   * Reject contract
   */
  private rejectContract = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.contract) {
      return;
    }

    const contract = this.props.contract;
    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    contract.status = "REJECTED";
    contract.rejectComment = this.props.rejectComment;
    await contractsService.updateContract(contract, contract.id || "");
    this.props.contractRejected();
  }

  /**
   * Render method for contract modal component
   */
  public render() {
    return (
      <Modal size="small" open={this.props.modalOpen} onClose={()=>this.closeModal} closeIcon>
        <Modal.Header>{strings.confirmRejectText}</Modal.Header>
        <Modal.Content >
          <Form>
            <TextArea
              value={this.props.rejectComment}
              onChange={(event: any) => this.props.onUserInputChange("rejectComment", event.target.value)}
              className="contract-text-area"
            />
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button.Group floated="right" className="contract-button-group" >
            <Button onClick={this.rejectContract} inverted color="red">{strings.decline}</Button>
            <Button.Or text="" />
            <Button onClick={this.closeModal} color="black">{strings.cancel}</Button>
          </Button.Group>
        </Modal.Actions>
      </Modal>
    );
  }
}

/**
 * Redux mapper for mapping store state to component props
 *
 * @param state store state
 */
function mapStateToProps(state: StoreState) {
  return {
    keycloak: state.keycloak
  };
}

/**
 * Redux mapper for mapping component dispatches
 *
 * @param dispatch dispatch method
 */
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ContractRejectModal);