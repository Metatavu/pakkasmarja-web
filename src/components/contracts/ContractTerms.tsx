import * as React from "react";
import * as actions from "../../actions/";
import { Dispatch } from "redux";
import { StoreState } from "../../types";
import { SignAuthenticationService, Contract } from "pakkasmarja-client";
import { connect } from "react-redux";
import Api from "pakkasmarja-client";
import BasicLayout from "../generic/BasicLayout";
import { Checkbox, Input, Button, Dropdown } from "semantic-ui-react";

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
  type: string;
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
    if (!this.props.keycloak || !this.props.keycloak.token {
      return;
    }

    /*if (this.props.navigation.getParam('contract')) {
      this.setState({ contract: this.props.navigation.getParam('contract') });
    }*/

    const contractId = this.props.match.params.contractId;
    const contract = await this.findContract(contractId);
    const signAuthenticationServicesService = await Api.getSignAuthenticationServicesService(this.props.keycloak.token);
    const signAuthenticationServices = await signAuthenticationServicesService.listSignAuthenticationServices();
    this.setState({ authServices: signAuthenticationServices });
  }

  /**
   * Find contract
   */
  private findContract = async (id: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    return await contractsService.findContract(id, "application/json");
  }


  /**
   * Accept contract
   */
  private backButtonClicked = async () => {
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
    console.log(contractSignRequest);
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
        <div>
          <div>
            <p>
              Sopimus
            </p>
            <p>
              {`Satokautta ${this.state.contract ? this.state.contract.year : ""} koskeva sopimus`}
            </p>
          </div>
          <div>
              <p onClick={this.downloadContractPdfClicked}>
                Lataa sopimus PDF - muodossa.
              </p>
          </div>
          <div>
            <Checkbox
              checked={this.state.acceptedTerms}
              onChange={() => this.setState({ acceptedTerms: !this.state.acceptedTerms })}
              label={"Olen lukenut ja hyväksyn sopimusehdot"}
            />
            <Checkbox
              checked={this.state.viableToSign}
              onChange={() => this.setState({ viableToSign: !this.state.viableToSign })}
              label={"Olen viljelijän puolesta edustuskelpoinen"}
            />
          </div>
          <div>
            <p>Tunnistautumispalvelu:</p>
            <div>
              <Dropdown
                placeholder="Valitse toimituspaikka"
                value={this.state.selectedSignServiceId}
                options={signServiceOptions}
                onChange={(event, data) => {
                  const value = data.value ? data.value.toString() : "";
                  this.setState({ selectedSignServiceId: value });
                } }
              />
            </div>
          </div>
          <div>
            <p>Henkilötunnus:</p>
            <Input
              value={this.state.ssn}
              onChange={(event: any) => this.setState({ ssn: event.target.value })}
            />
          </div>
          <div>
            <Button onClick={this.backButtonClicked}>
              Takaisin
            </Button>
            <Button onPress={this.signContractClicked}>
              Allekirjoita
            </Button>
          </div>
        </div>
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