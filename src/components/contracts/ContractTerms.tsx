import * as React from "react";
import * as actions from "../../actions/";
import { Dispatch } from "redux";
import { StoreState } from "../../types";
import { SignAuthenticationService, Contract } from "pakkasmarja-client";
import { connect } from "react-redux";
import Api from "pakkasmarja-client";
import BasicLayout from "../generic/BasicLayout";
import { Checkbox, Input, Button, Dropdown, Container, Header, Divider, Form, Modal } from "semantic-ui-react";
import { PDFService } from "src/api/pdf.service";
import "./styles.scss";

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
  modalText: string;
  pdfType: string;
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
      selectedSignServiceId: "0",
      ssn: "",
      signAuthenticationUrl: "",
      modalOpen: false,
      type: "2019",
      modalText: "",
      pdfType: "2019"
    };
  }

  /**
   * Component did mount
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token ){
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
   * Download contract as pdf
   */
  private downloadContractPdfClicked = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract || !this.state.contract.id) {
      return;
    }

    if (this.state.contract.status !== "APPROVED") {
      const content = "Allekirjoita sopimus ennen latausta.";
      this.setState({ modalOpen: true, modalText: content });
    }

    const pdfService = new PDFService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);
    const pdfData = await pdfService.getPdf(this.state.contract.id, this.state.pdfType);
    this.downloadPdfBlob(pdfData);
  }

  /**
   * Download pdf to users computer
   * 
   * @param pdfData pdf data
   */
  private downloadPdfBlob = (pdfData: any) => {
    pdfData.blob().then((blob: any) => {
      const pdfBlob = new Blob([blob], {type: "application/pdf"});
      const data = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = data;
      link.download = `${new Date().toLocaleDateString()}.pdf`;
      link.click();
      setTimeout(function() {
        window.URL.revokeObjectURL(data);
      }, 100);
    });
  }

  /**
   * Sign contract clicked
   */
  private signContractClicked = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    if (!this.state.acceptedTerms) {
      const content = "Sinun tulee hyväksyä sopimusehdot ennen allekirjotusta.";
      this.setState({ modalText: content, modalOpen: true });
      return;
    }

    if (!this.state.viableToSign) {
      const content = "Sinun tulee olla viljelijän puolesta edustuskelpoinen.";
      this.setState({ modalText: content, modalOpen: true });
      return;
    }

    if (!this.state.ssn) {
      const content = "Sinun tulee antaa henkilötunnus.";
      this.setState({ modalText: content, modalOpen: true });
      return;
    }

    const contractsService = Api.getContractsService(this.props.keycloak.token);
    const contractSignRequest = await contractsService.createContractDocumentSignRequest({ redirectUrl: "" }, this.state.contract.id || "", this.state.type, this.state.ssn, this.state.selectedSignServiceId);
    if (contractSignRequest && contractSignRequest.redirectUrl) {
      const content = "Allekirjoitus jatkuu avatussa välilehdessä. Kun olet valmis voit sulkea tämän ilmoituksen.";
      this.setState({ modalOpen: true, modalText: content });
      window.open(contractSignRequest.redirectUrl, "_blank");
    } else {
      const content = "Jotain meni pieleen. Varmista, että olet valinnut tunnistautumispalvelun ja henkilötunnus on oikeassa muodossa.";
      this.setState({ modalText: content, modalOpen: true });
      return;
    }
  }

  /**
   * Render method
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
              onChange={(event: any) => this.setState({ ssn: event.target.value })}
            />
            </Form.Field>
          </Form>
          <Button.Group floated="right" className="contract-button-group" >
            <Button onClick={this.signContractClicked} color="red">ALLEKIRJOITA</Button>
            <Button.Or text="" />
            <Button onClick={this.downloadContractPdfClicked} inverted color="red">Lataa sopimus PDF - muodossa.</Button>
            <Button.Or text="" />
            <Button  color="black">TAKAISIN</Button>
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