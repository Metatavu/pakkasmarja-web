import * as React from "react";
import { StoreState } from "../../types";
import { SignAuthenticationService, Contract } from "pakkasmarja-client";
import { connect } from "react-redux";
import Api from "pakkasmarja-client";

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
  authServices?: SignAuthenticationService[],
  contract?: Contract,
  styles?: any,
  acceptedTerms: boolean,
  viableToSign: boolean,
  selectedSignServiceId: string,
  ssn: string,
  signAuthenticationUrl: string,
  modalOpen: boolean,
  type: string
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

    const pdfService = Api.getPdfService(this.props.keycloak.token);
    const pdfPath = await pdfService.findPdf(this.state.contract.id, new Date().getFullYear().toString(), `${new Date().toLocaleDateString()}.pdf`);

    const header = "Lataus onnistui!";
    const content = `PDF tiedosto on tallennettu polkuun ${pdfPath}. Palaa sopimuksiin painamalla OK.`;
    const buttons = [{text: 'OK', onPress: () => this.props.navigation.navigate('Contracts', {})}];
    this.displayAlert(header, content, buttons);
  }

  /**
   * Accept contract
   */
  private signContractClicked = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    if (!this.state.acceptedTerms) {
      const header = "Allekirjoitus epäonnistui";
      const content = "Sinun tulee hyväksyä sopimusehdot ennen allekirjotusta.";
      const buttons = [{text: 'OK', onPress: () => {}}];
      this.displayAlert(header, content, buttons);
      return;
    }

    if (!this.state.viableToSign) {
      const header = "Allekirjoitus epäonnistui";
      const content = "Sinun tulee olla viljelijän puolesta edustuskelpoinen.";
      const buttons = [{text: 'OK', onPress: () => {}}];
      this.displayAlert(header, content, buttons);
      return;
    }

    if (!this.state.ssn) {
      const header = "Allekirjoitus epäonnistui";
      const content = "Sinun tulee antaa henkilötunnus.";
      const buttons = [{text: 'OK', onPress: () => {}}];
      this.displayAlert(header, content, buttons);
      return;
    }

    const contractsService = Api.getContractsService(this.props.keycloak.token);
    const contractSignRequest = await contractsService.createContractDocumentSignRequest({ redirectUrl: "" }, this.state.contract.id || "", this.state.type, this.state.ssn, this.state.selectedSignServiceId);
    
    if (contractSignRequest && contractSignRequest.redirectUrl) {
      this.setState({ signAuthenticationUrl: contractSignRequest.redirectUrl, modalOpen: true });
    } else {
      const header = "Allekirjoitus epäonnistui";
      const content = "Jotain meni pieleen. Varmista, että olet valinnut tunnistautumispalvelun ja henkilötunnus on oikeassa muodossa.";
      const buttons = [{text: 'OK', onPress: () => {}}];
      this.displayAlert(header, content, buttons);
      return;
    }
  }

  /**
   * Display alert
   */
  private displayAlert = (header: string, content: string, buttons: ModalButton[]) => {
    alert(content);
    /*Alert.alert(
      header,
      content,
      buttons
    );*/
  }

  /**
   * When signed successfully
   */
  private onSignSuccess = () => {
    this.setState({ modalOpen: false });

    const header = "Allekirjoitus onnistui!";
    const content = "Palaa sopimuksiin painamalla OK.";
    const buttons = [{text: 'OK', onPress: () => this.props.navigation.navigate('Contracts', {})}];
    this.displayAlert(header, content, buttons);
  }

  /**
   * Accept contract
   */
  private backButtonClicked = async () => {
    this.props.navigation.goBack(null);
  }

  static navigationOptions = {
    headerTitle: <TopBar
      showMenu={true}
      showHeader={false}
      showUser={true}
    />
  };

  /**
   * Render method for contract modal component
   */
  public render() {
    return (
      <BasicLayout navigation={this.props.navigation} backgroundColor="#fff" displayFooter={true}>
        <View style={styles.WhiteContentView}>
          <View>
            <Text style={styles.ContentHeader}>
              Sopimus
            </Text>
            <Text style={styles.Text}>
              {`Satokautta ${this.state.contract ? this.state.contract.year : ""} koskeva sopimus`}
            </Text>
          </View>
          <View>
            <TouchableOpacity onPress={this.downloadContractPdfClicked}>
              <Text style={styles.linkStyle}>
                Lataa sopimus PDF - muodossa.
                </Text>
            </TouchableOpacity>
          </View>
          <View>
            <CheckBox
              checked={this.state.acceptedTerms}
              onPress={() => this.setState({ acceptedTerms: !this.state.acceptedTerms })}
              title='Olen lukenut ja hyväksyn sopimusehdot'
            />
            <CheckBox
              checked={this.state.viableToSign}
              onPress={() => this.setState({ viableToSign: !this.state.viableToSign })}
              title='Olen viljelijän puolesta edustuskelpoinen'
            />
          </View>
          <View>
            <Text style={[styles.Text, styles.TextBold]}>Tunnistautumispalvelu:</Text>
            <View style={styles.InputStyle}>
              <Picker
                selectedValue={this.state.selectedSignServiceId}
                style={{ height: 50, width: "100%", color: "black" }}
                onValueChange={(itemValue) =>
                  this.setState({ selectedSignServiceId: itemValue })
                }>
                {
                  this.state.authServices && this.state.authServices.map((authService) => {
                    return (
                      <Picker.Item key={authService.identifier} label={authService.name || ""} value={authService.identifier} />
                    );
                  })
                }
              </Picker>
            </View>
          </View>
          <View>
            <Text style={[styles.Text, styles.TextBold]}>Henkilötunnus:</Text>
            <TextInput
              style={styles.InputStyle}
              value={this.state.ssn}
              onChangeText={(text: string) => this.setState({ ssn: text })}
            />
          </View>
          <View style={styles.flexView}>
            <TouchableOpacity style={styles.smallRedButton} onPress={this.backButtonClicked}>
              <Text style={styles.buttonText}>
                TAKAISIN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallRedButton} onPress={this.signContractClicked}>
              <Text style={styles.buttonText}>
                ALLEKIRJOITA
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Modal isVisible={this.state.modalOpen} style={{ height: "100%", width: "100%" }}>
          <WebView
            source={{uri: this.state.signAuthenticationUrl}}
            style={{width: "90%", height: "100%"}}
            onNavigationStateChange={(webViewState: any) => {
              const contractId = this.state.contract ? this.state.contract.id : null;
              if (webViewState.url.indexOf(`contractId=${contractId}`) > 0) {
                this.onSignSuccess;
              }
          }}
          />
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
function mapStateToProps(state: StoreState) {
  return {
    accessToken: state.accessToken
  };
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    onAccessTokenUpdate: (accessToken: AccessToken) => dispatch(actions.accessTokenUpdate(accessToken))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ContractTerms);