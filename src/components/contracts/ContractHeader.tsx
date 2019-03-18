import * as React from "react";
import "../../styles/common.scss";
import { Header } from "semantic-ui-react";
import { ItemGroup } from "pakkasmarja-client";

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
    return <Header as="h1">{itemGroupName}</Header>
  }

  /**
   * Render container
   * 
   * @param category category
   */
  private renderContainer = (category: string) => {
    return (
      <div>
        {
          category === "FROZEN" &&
            <p>
              {`Pakkasmarja Oy:n ja viljelijän sopimus pakastukseen toimitettavista marjoista ja niiden hinnoista satokaudella ${new Date().getFullYear()}.`}
            </p>
        }
        {
          category !== "FROZEN" &&
            <p>
              {"Pakkasmarja Oy:n ja viljelijän sopimus tuoremarjakauppaan toimitettavista marjoista."}
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
      <div className="contract-section">
        { this.renderHeader(itemGroupName) }
        { this.renderContainer(itemGroupCategory) }
      </div>
    );
  }
}