import * as React from "react";
import "../../styles/common.scss";
import { Item, Modal, Icon, SemanticICONS, SemanticCOLORS, Divider } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { ContractTableData } from "src/types";
import { Contract } from "pakkasmarja-client";
import ContractAmountTable from "./ContractAmountTable";
import strings from "src/localization/strings";

/**
 * Interface for component State
 */
interface Props {
  contractData: ContractTableData;
}

/**
 * Interface for component State
 */
interface State {
  open: boolean;
}

/**
 * Class for contract item component
 */
export default class ContractItem extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      open: false
    };
  }

  /**
   * Render item description
   * 
   * @param status status
   */
  private renderItemDescription = (status: Contract.StatusEnum) => {
    switch (status) {
      case "APPROVED":
        return this.renderContractAmountTable();
      case "DRAFT":
        return this.renderDescription(strings.checkDraft, "envelope", "red");
      case "ON_HOLD":
        return this.renderDescription(strings.onHold);
      case "REJECTED":
        return this.renderDescription(strings.rejected, "x", "black");
      default:
        return <Item.Description></Item.Description>;
    }
  }

  /**
   * Render contract amount table
   */
  private renderContractAmountTable = () => {
    return (
      <React.Fragment>
        <Item.Description>
          <ContractAmountTable contractData={this.props.contractData} />
        </Item.Description>
        <Divider />
      </React.Fragment>
    );
  }

  /**
   * Render description
   * 
   * @param text text
   */
  private renderDescription = (text: string, icon?: SemanticICONS, iconColor?: SemanticCOLORS) => {
    return (
      <React.Fragment>
        <Item.Description>
          {icon && <Icon color={iconColor} name={icon} />} {text}
        </Item.Description>
        <Divider />
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
   * Render method
   */
  public render() {
    const itemGroupName = this.props.contractData.itemGroup ? this.props.contractData.itemGroup.displayName : "-";
    const contractStatus = this.props.contractData.contract.status;
    return (
      <React.Fragment>
        <Item.Group style={{margin:0}}>
          <Item >
            {
              contractStatus === "ON_HOLD" || contractStatus === "REJECTED" ?
                <Item.Content className="open-modal-element" onClick={() => this.setState({ open: true })}>
                  <Item.Header>{itemGroupName}</Item.Header>
                  {this.renderItemDescription(contractStatus)}
                </Item.Content>
                :
                <Item.Content className="open-modal-element" as={Link} to={`contracts/${this.props.contractData.contract.id}`}>
                  <Item.Header>{itemGroupName}</Item.Header>
                  {this.renderItemDescription(contractStatus)}
                </Item.Content>
            }
          </Item>
        </Item.Group>
        <Modal size="small" open={this.state.open} onClose={() => this.setState({ open: false })} closeIcon>
          <Modal.Content>{this.getModalContentText(contractStatus)}</Modal.Content>
        </Modal>
      </React.Fragment>
    );
  }
}