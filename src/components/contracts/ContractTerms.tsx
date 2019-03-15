import * as React from "react";
import * as actions from "../../actions/";
import { Dispatch } from "redux";
import { StoreState } from "../../types";
import { SignAuthenticationService, Contract } from "pakkasmarja-client";
import { connect } from "react-redux";
import Api from "pakkasmarja-client";
import BasicLayout from "../generic/BasicLayout";
import { Checkbox, Input, Button, Dropdown, Container, Header, Divider, Form } from "semantic-ui-react";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance
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
  type: string;
  match?: any;
};

/**
 * Contract terms component class
 */
class ContractTerms extends React.Component<Props, State> {
  /**
   * Constructor
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      acceptedTerms: false,
      viableToSign: false,
      selectedSignServiceId: "0",
      ssn: "",
      signAuthenticationUrl: "",
      modalOpen: false,
      type: "2019"
    };
  }

  /**
   * Component did mount
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    /*if (this.props.navigation.getParam('contract')) {
      this.setState({ contract: this.props.navigation.getParam('contract') });
    }*/

    const signAuthenticationServicesService = await Api.getSignAuthenticationServicesService(this.props.keycloak.token);
    const signAuthenticationServices = await signAuthenticationServicesService.listSignAuthenticationServices();
    this.setState({ authServices: signAuthenticationServices });
  }

  /**
   * Download contract as pdf
   */
  private downloadContractPdfClicked = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract || !this.state.contract.id) {
      return;
    }

    //const pdfService = Api.getContractsService(this.props.keycloak.token);
    window.open();
    /*const pdfData = await pdfService.getContractDocument(this.state.contract.id, "2019", "PDF");

    const header = "Lataus onnistui!";
    const content = `PDF tiedosto on tallennettu polkuun ${pdfPath}. Palaa sopimuksiin painamalla OK.`;
    const buttons = [{p: 'OK', onPress: () => this.props.navigation.navigate('Contracts', {})}];
    this.displayAlert(header, content, buttons);*/
  }

  /**
   * Accept contract
   */
  private signContractClicked = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    /*if (!this.state.acceptedTerms) {
      const header = "Allekirjoitus epäonnistui";
      const content = "Sinun tulee hyväksyä sopimusehdot ennen allekirjotusta.";
      const buttons = [{p: 'OK', onPress: () => {}}];
      this.displayAlert(header, content, buttons);
      return;
    }

    if (!this.state.viableToSign) {
      const header = "Allekirjoitus epäonnistui";
      const content = "Sinun tulee olla viljelijän puolesta edustuskelpoinen.";
      const buttons = [{p: 'OK', onPress: () => {}}];
      //this.displayAlert(header, content, buttons);
      return;
    }

    if (!this.state.ssn) {
      const header = "Allekirjoitus epäonnistui";
      const content = "Sinun tulee antaa henkilötunnus.";
      const buttons = [{p: 'OK', onPress: () => {}}];
      //this.displayAlert(header, content, buttons);
      return;
    }*/

    const contractsService = Api.getContractsService(this.props.keycloak.token);
    const contractSignRequest = await contractsService.createContractDocumentSignRequest({ redirectUrl: "" }, this.state.contract.id || "", this.state.type, this.state.ssn, this.state.selectedSignServiceId);

    if (contractSignRequest && contractSignRequest.redirectUrl) {
      this.setState({ signAuthenticationUrl: contractSignRequest.redirectUrl, modalOpen: true });
    } else {
      /*const header = "Allekirjoitus epäonnistui";
      const content = "Jotain meni pieleen. Varmista, että olet valinnut tunnistautumispalvelun ja henkilötunnus on oikeassa muodossa.";
      const buttons = [{p: 'OK', onPress: () => {}}];*/
      //this.displayAlert(header, content, buttons);
      return;
    }
  }

  /**
   * When signed successfully
   */
  /*private onSignSuccess = () => {
    this.setState({ modalOpen: false });
    
    const header = "Allekirjoitus onnistui!";
    const content = "Palaa sopimuksiin painamalla OK.";
    
  }*/

  /**
   * Render method for contract modal component
   */
  public render() {
    const signServiceOptions = this.state.authServices && this.state.authServices.map((authService) => {
      return {
        key: authService.identifier,
        value: authService.identifier,
        text: authService.name
      }
    });

    return (
      <BasicLayout>
        <Container text>
          <Divider horizontal>
            <Header as='h2'>
              Sopimus
              </Header>
          </Divider>
          <Form>
            <Header as='h3'>{`Satokautta ${this.state.contract ? this.state.contract.year : ""} koskeva sopimus`}</Header>
            <Form.Field>
            <Checkbox
              checked={this.state.acceptedTerms}
              onChange={() => this.setState({ acceptedTerms: !this.state.acceptedTerms })}
              label={"Olen lukenut ja hyväksyn sopimusehdot"}
            />
            </Form.Field>
            <Form.Field>
            <Checkbox
              checked={this.state.viableToSign}
              onChange={() => this.setState({ viableToSign: !this.state.viableToSign })}
              label={"Olen viljelijän puolesta edustuskelpoinen"}
            />
            </Form.Field>
            <Form.Field>
            <p>Tunnistautumispalvelu:</p>
            <Dropdown
              fluid
              selection
              placeholder="Valitse toimituspaikka"
              value={this.state.selectedSignServiceId}
              options={signServiceOptions}
              onChange={(event, data) => {
                const value = data.value ? data.value.toString() : "";
                this.setState({ selectedSignServiceId: value });
              }}
            />
            </Form.Field>
            <Form.Field>
            <p>Henkilötunnus:</p>
            <Input
              value={this.state.ssn}
              onChangeText={(event: any) => this.setState({ ssn: event.target.value })}
            />
            </Form.Field>
          </Form>
          <Button.Group floated="right" style={{ marginTop: "2.5%" }} >
            <Button onClick={this.signContractClicked} color="red">ALLEKIRJOITA</Button>
            <Button.Or text="" />
            <Button onClick={this.downloadContractPdfClicked} inverted color="red">Lataa sopimus PDF - muodossa.</Button>
            <Button.Or text="" />
            <Button  color="black">TAKAISIN</Button>
          </Button.Group>
        </Container>
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