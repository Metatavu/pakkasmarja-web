import * as React from "react";
import * as actions from "../../actions/";
import { Dispatch } from "redux";
import { StoreState } from "../../types";
import { SignAuthenticationService, Contract } from "pakkasmarja-client";
import { connect } from "react-redux";
import Api from "pakkasmarja-client";
import BasicLayout from "../generic/BasicLayout";
import { Checkbox, Input, Button, Dropdown, Container, Header, Divider, Form, Modal, Dimmer, Loader } from "semantic-ui-react";
import "./styles.css";
import { Link } from "react-router-dom";
import strings from "src/localization/strings";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
};

/**
 * Interface for component state
 */
interface State {
  authServices?: SignAuthenticationService[];
  contract?: Contract;
  styles?: any;
  acceptedTerms: boolean;
  viableToSign: boolean;
  selectedSignServiceId: string;
  ssn: string;
  signAuthenticationUrl: string;
  modalOpen: boolean;
  modalText: string;
  waitingSignService: boolean;
};

/**
 * Contract terms component class
 */
class ContractTerms extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      acceptedTerms: false,
      viableToSign: false,
      selectedSignServiceId: "",
      ssn: "",
      signAuthenticationUrl: "",
      modalOpen: false,
      modalText: "",
      waitingSignService: false
    };
  }

  /**
   * Component did mount
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contractId = this.props.match.params.contractId;
    const contract = await this.findContract(contractId);
    const signAuthenticationServicesService = await Api.getSignAuthenticationServicesService(this.props.keycloak.token);
    const signAuthenticationServices = await signAuthenticationServicesService.listSignAuthenticationServices();

    this.setState({ authServices: signAuthenticationServices, contract: contract });
  }

  /**
   * Find contract
   * 
   * @param id id
   */
  private findContract = async (id: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    return await contractsService.findContract(id, "application/json");
  }

  /**
   * Sign contract clicked
   */
  private signContractClicked = async () => {
    const { keycloak } = this.props;
    const {
      contract,
      selectedSignServiceId,
      acceptedTerms,
      viableToSign,
      ssn
    } = this.state;

    if (!keycloak?.token || !contract?.id) {
      return;
    }

    if (!selectedSignServiceId) {
      const content = strings.authServiceNotSelected;
      this.setState({ modalText: content, modalOpen: true });
    }

    if (!acceptedTerms) {
      const content = strings.termsNotAccepted;
      this.setState({ modalText: content, modalOpen: true });
      return;
    }

    if (!viableToSign) {
      const content = strings.notViableToSign;
      this.setState({ modalText: content, modalOpen: true });
      return;
    }

    if (!ssn) {
      const content = strings.missingInfo;
      this.setState({ modalText: content, modalOpen: true });
      return;
    }

    this.setState({ waitingSignService: true });

    const baseUrl = `${location.protocol}//${location.hostname}${location.port ? ':' + location.port : ''}`;
    const redirectUrl = `${baseUrl}/contracts/${contract.id}`;
    const contractsService = Api.getContractsService(keycloak.token);

    const contractSignRequest = await contractsService.createContractDocumentSignRequest(
      { redirectUrl: "" },
      contract.id,
      new Date().getFullYear().toString(),
      ssn,
      selectedSignServiceId,
      redirectUrl
    );

    if (contractSignRequest && contractSignRequest.redirectUrl) {
      const content = strings.signingContinuesOnNewTab;
      this.setState({ modalOpen: true, modalText: content });
      window.location.href = contractSignRequest.redirectUrl;
    } else {
      const content = strings.signingWentWrong;
      this.setState({ modalText: content, modalOpen: true });
      return;
    }
  }

  /**
   * Render method
   */
  public render() {
    const {
      authServices,
      waitingSignService,
      contract,
      acceptedTerms
    } = this.state;

    const signServiceOptions = authServices?.map(authService => ({
      key: authService.identifier,
      value: authService.identifier,
      text: authService.name
    }));

    if (waitingSignService) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted> Ladataan... </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <BasicLayout>
        <Container text>
          <Divider horizontal>
            <Header as='h2'>
              { strings.contract }
            </Header>
          </Divider>
          <Form>
            <Header as='h3'>
              { strings.formatString(strings.contractHarvestSeason, contract?.year ?? "") }
            </Header>
            <Form.Field>
              <Checkbox
                checked={ acceptedTerms }
                onChange={ () => this.setState({ acceptedTerms: !acceptedTerms }) }
                label={ strings.termsAccepted }
              />
            </Form.Field>
            <Form.Field>
              <Checkbox
                checked={this.state.viableToSign}
                onChange={() => this.setState({ viableToSign: !this.state.viableToSign })}
                label={strings.viableToSign}
              />
            </Form.Field>
            <Form.Field>
              <p>{strings.signingService}:</p>
              {
                this.state.authServices &&
                <Dropdown
                  fluid
                  selection
                  placeholder={strings.signingService}
                  value={this.state.selectedSignServiceId}
                  options={signServiceOptions}
                  onChange={ (event, data) =>
                    data.value && this.setState({ selectedSignServiceId: data.value.toString() })
                  }
                />
              }
            </Form.Field>
            <Form.Field>
              <p>{strings.ssn}:</p>
              <Input
                value={this.state.ssn}
                onChange={(event: any) => this.setState({ ssn: event.target.value })}
              />
            </Form.Field>
          </Form>
          <Button.Group floated="right" className="contract-button-group" >
            <AsyncButton onClick={ this.signContractClicked } color="red">{ strings.sign }</AsyncButton>
            <Button.Or text="" />
            <Button as={Link} to={`/contracts/${this.state.contract ? this.state.contract.id : ""}`} color="black">{strings.back}</Button>
          </Button.Group>
        </Container>
        <Modal size="small" open={this.state.modalOpen} onClose={() => this.setState({ modalOpen: false })} closeIcon>
          <Modal.Content>{this.state.modalText}</Modal.Content>
        </Modal>
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

export default connect(mapStateToProps, mapDispatchToProps)(ContractTerms);