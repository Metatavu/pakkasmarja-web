import * as React from "react";
import "../../styles/common.scss";
import { Item } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { ContractTableData } from "src/types";
import { Contract } from "pakkasmarja-client";
import ContractAmountTable from "./ContractAmountTable";

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
        return this.renderDescription("Tarkasta ehdotus");
      case "ON_HOLD":
        return this.renderDescription("Pakkasmarjan tarkistettavana");
      case "REJECTED":
        return this.renderDescription("Hylätty");
      default:
        return <Item.Description></Item.Description>;
    }
  }

  /**
   * Render contract amount table
   */
  renderContractAmountTable = () => {
    return (
      <Item.Description>
        <ContractAmountTable contractData={this.props.contractData}/>
      </Item.Description>
    );
  }

  /**
   * Render description
   * 
   * @param text text
   */
  private renderDescription = (text: string) => {
    return (
      <Item.Description>
        {text}
      </Item.Description>
    );
  }

  /**
   * Handle item click
   */
  private alertCantOpen = (status: string) => {
    let infoText = "";

    if (status === "REJECTED") {
      infoText = "Olet hylännyt tämän sopimuksen. Jos näin ei kuuluisi olla, ota yhteyttä pakkasmarjaan.";
    } else if (status === "ON_HOLD") {
      infoText = "Sopimus on pakkasmarjalla tarkistettavana.";
    }

    alert(infoText);
  }

  /**
   * Render method
   */
  public render() {
    const itemGroupName = this.props.contractData.itemGroup ? this.props.contractData.itemGroup.displayName : "-";
    const contractStatus = this.props.contractData.contract.status;

    return (
      <Item>
        {
          contractStatus === "ON_HOLD" || contractStatus === "REJECTED" ? 
            <Item.Content onClick={() => this.alertCantOpen(contractStatus)}>
              <Item.Header>{itemGroupName}</Item.Header>
                { this.renderItemDescription(contractStatus) }
            </Item.Content> 
            :
            <Item.Content as={Link} to={`contracts/${this.props.contractData.contract.id}`}>
              <Item.Header>{itemGroupName}</Item.Header>
                { this.renderItemDescription(contractStatus) }
            </Item.Content>
        }
      </Item>
    );
  }
}