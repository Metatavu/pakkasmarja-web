import * as React from "react";
import "../../styles/common.scss";
import { Item } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { ContractTableData } from "src/types";
import { Contract } from "pakkasmarja-client";

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
        return this.renderDescription("Hyväksytty");
      case "DRAFT":
        return this.renderDescription("Vedos");
      case "ON_HOLD":
        return this.renderDescription("Odottaa");
      case "REJECTED":
        return this.renderDescription("Hylätty");
      case "TERMINATED":
        return this.renderDescription("Päättynyt");
      default:
        return <Item.Description></Item.Description>;
    }
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
   * Render method
   */
  public render() {
    const itemGroupName = this.props.contractData.itemGroup ? this.props.contractData.itemGroup.displayName : "-";
    const contractStatus = this.props.contractData.contract.status;
    return (
      <React.Fragment>
        <Item.Group>
          <Item>
            <Item.Content as={Link} to={`contractManagement/${this.props.contractData.contract.id}`}>
              <Item.Header>{itemGroupName}</Item.Header>
              {this.renderItemDescription(contractStatus)}
            </Item.Content>
          </Item>
        </Item.Group>
      </React.Fragment>
    );
  }
}