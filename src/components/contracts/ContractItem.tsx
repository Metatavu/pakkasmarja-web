import * as React from "react";
import "../../styles/common.css";
import { Modal, Icon, SemanticICONS, SemanticCOLORS, Table } from "semantic-ui-react";
import { ContractTableData, StoreState } from "src/types";
import strings from "src/localization/strings";
import { Redirect } from "react-router-dom";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import * as actions from "../../actions/";
import { PDFService } from "src/api/pdf.service";
import FileUtils from "src/utils/FileUtils";
import { ContractStatus } from "pakkasmarja-client";

/**
 * Interface for component State
 */
interface Props {
  contractData: ContractTableData;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component State
 */
interface State {
  open: boolean;
  redirect: boolean;
}

/**
 * Class for contract item component
 */
class ContractItem extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      open: false,
      redirect: false
    };
  }

  /**
   * Render item description
   * 
   * @param status status
   */
  private renderItemDescription = (status: ContractStatus) => {
    switch (status) {
      case "DRAFT":
        return this.renderDescription(strings.checkDraft, "envelope", "red");
      case "ON_HOLD":
        return this.renderDescription(strings.onHold, "wait");
      case "REJECTED":
        return this.renderDescription(strings.rejected, "x");
      case "TERMINATED":
        return this.renderDescription(strings.contractTerminated, 'thumbs up', 'red');
      default:
        return;
    }
  }

  /**
   * Render description
   * 
   * @param text text
   */
  private renderDescription = (text: string, icon?: SemanticICONS, iconColor?: SemanticCOLORS) => {
    return (
      <React.Fragment>
        {icon && <Icon color={iconColor} name={icon} />} {text}
      </React.Fragment>
    );
  }

  /**
   * Returns modal content text
   * 
   * @param status status
   */
  private getModalContentText = (status: string) => {
    let infoText = "";

    if (status === "REJECTED") {
      infoText = strings.infoRejected;
    } else if (status === "ON_HOLD") {
      infoText = strings.infoOnHold;
    }

    return infoText;
  }

  /**
   * Download pdf
   */
  private downloadPdf = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contractId = this.props.contractData.contract.id || "";
    const type = this.props.contractData.contract.year.toString();
    const pdfService = new PDFService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);
    const pdfData: Response = await pdfService.getPdf(contractId, type);
    this.downloadPdfBlob(pdfData, "sopimus", contractId);

  }

  /**
   * Download pdf to users computer
   * 
   * @param pdfData pdf data
   */
  private downloadPdfBlob = (pdfData: Response, downloadTitle: string, contractId: string) => {

    pdfData.blob().then((blob: Blob) => {
      FileUtils.downloadBlob(blob, "application/pdf", `${downloadTitle} - ${contractId}.pdf`);
    });
  }

  /**
   * Render method
   */
  public render() {

    if (this.state.redirect) {
      return (
        <Redirect to={`contracts/${this.props.contractData.contract.id}`} />
      );
    }
    const contractYear = this.props.contractData.contract.year;
    const itemGroupName = this.props.contractData.itemGroup ? this.props.contractData.itemGroup.displayName : "-";
    const contractStatus = this.props.contractData.contract.status;
    const contractQuantity = this.props.contractData.contract.contractQuantity;
    const deliveredQuantity = this.props.contractData.contract.deliveredQuantity;
    return (
      <React.Fragment>
        {
          contractStatus === "ON_HOLD" || contractStatus === "REJECTED" || contractStatus === "DRAFT" ?
            <Table.Row className="open-modal-element" onClick={contractStatus === "DRAFT" ? () => this.setState({ redirect: true }) : () => this.setState({ open: true })}>
              <Table.Cell>
                {itemGroupName}
              </Table.Cell>
              <Table.Cell>
                {this.renderItemDescription(contractStatus)}
              </Table.Cell>
              <Table.Cell textAlign="center">
                {contractStatus === "DRAFT" && <Icon size="large" name="arrow right" />}
              </Table.Cell>
            </Table.Row>
            : null
        }
        {
          contractStatus === "APPROVED" &&
          <Table.Row className="contract-row">
            <Table.Cell className="contract-cell" onClick={() => this.setState({ redirect: true })}>
              {itemGroupName}
            </Table.Cell>
            <Table.Cell className="contract-cell" onClick={() => this.setState({ redirect: true })}>
              {deliveredQuantity}
            </Table.Cell>
            <Table.Cell className="contract-cell" onClick={() => this.setState({ redirect: true })}>
              {contractQuantity}
            </Table.Cell>
            <Table.Cell className="pdf-icon" onClick={this.downloadPdf} textAlign="center">
              <Icon size="large" name="file pdf outline" />
            </Table.Cell>
          </Table.Row>
        }
        {
          contractStatus === "TERMINATED" ?
            <Table.Row >
              <Table.Cell >
                {`${itemGroupName} (${contractYear})`}
              </Table.Cell>
              <Table.Cell>
                {this.renderItemDescription(contractStatus)}
              </Table.Cell>
              <Table.Cell className="pdf-icon" textAlign="center">
                {contractYear > 2017 &&
                  <Icon onClick={this.downloadPdf} size="large" name="file pdf outline" />
                }
              </Table.Cell>
            </Table.Row>
            : null
        }
        <Modal size="small" open={this.state.open} onClose={() => this.setState({ open: false })} closeIcon>
          <Modal.Content>{this.getModalContentText(contractStatus)}</Modal.Content>
        </Modal>
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

export default connect(mapStateToProps, mapDispatchToProps)(ContractItem);
