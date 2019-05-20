import * as React from "react";
import "../../styles/common.css";
import { Header } from "semantic-ui-react";
import { ItemGroup } from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Interface for component State
 */
interface Props {
  itemGroup?: ItemGroup;
}

/**
 * Interface for component State
 */
interface State {
}

/**
 * Class for contract header component
 */
export default class ContractHeader extends React.Component<Props, State> {

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
   * Render header
   * 
   * @param itemGroupName item group name
   */
  private renderHeader = (itemGroupName: string) => {
    return <Header color="red" as="h1">{itemGroupName}</Header>
  }

  /**
   * Render container
   * 
   * @param category category
   */
  private renderContainer = (category: string) => {
    return (
      <div className="contract-blue-container">
        {
          category === "FROZEN" &&
            <p className="font-bold">
              {strings.formatString(strings.contractFrozenHeader, new Date().getFullYear())}
            </p>
        }
        {
          category !== "FROZEN" &&
            <p className="font-bold">
              {strings.contractFreshHeader}
            </p>
        }
      </div>
    );
  }

  /**
   * Render method
   */
  public render() {
    if (!this.props.itemGroup) {
      return <div></div>;
    }

    const itemGroupName = this.props.itemGroup.displayName || this.props.itemGroup.name || "";
    const itemGroupCategory = this.props.itemGroup.category || "";

    return (
      <div>
        { this.renderHeader(itemGroupName) }
        { this.renderContainer(itemGroupCategory) }
      </div>
    );
  }
}