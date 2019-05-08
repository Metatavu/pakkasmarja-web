import * as React from "react";
import * as actions from "../../actions";
import { Dispatch } from "redux";
import { StoreState } from "../../types";
import { connect } from "react-redux";
import { Header, Accordion } from "semantic-ui-react";
import "./styles.scss";
import strings from "src/localization/strings";
import { PDFService } from "src/api/pdf.service";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
  contractId: string;
};

/**
 * Interface for component state
 */
interface State {
};

/**
 * Contract document component class
 */
class ContractDocument extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
    };
  }

  /**
   * Component did mount
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    this.downloadContractDocumentHtml();

  }

  /**
   * Download contract as html
   */
  private downloadContractDocumentHtml = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.contractId) {
      return;
    }

    const fileService = new PDFService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);
    console.log(new Date().getFullYear().toString());
    fileService.getHtml(this.props.contractId, new Date().getFullYear().toString())
      .then((response) => {
        return response.text()
      })
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const body: any = (doc.querySelector('div'));
        const contractContent = document.querySelector(".contractContent");
        if (contractContent) {
          contractContent.appendChild(body);
        }
      })
      .catch(function (err) {
        console.log('Failed to fetch page: ', err);
      });
  }

  /**
   * Render method
   */
  public render() {

    const panel =
      [{
        title: {
          key: "contract-document-title",
          content: strings.showContract,
          icon: 'question',
        },
        content: {
          content: (
            <div key="contract-document-content" className="contractContent" />
          ),
        },
      }]

    return (
      <React.Fragment>
        <div className="contract-blue-container">
          <Header as='h2'>
            {strings.contract}
          </Header>
          <Accordion panels={panel} />
        </div>
      </React.Fragment>
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

export default connect(mapStateToProps, mapDispatchToProps)(ContractDocument);