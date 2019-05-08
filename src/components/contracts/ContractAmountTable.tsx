import * as React from "react";
import "../../styles/common.scss";
import { Grid } from "semantic-ui-react";
import { ContractTableData } from "src/types";
import strings from "../../localization/strings";

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
 * Class for contract amount table component
 */
export default class ContractAmountTable extends React.Component<Props, State> {

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
   * Render method
   */
  public render() {
    const contractQuantity = this.props.contractData.contract.contractQuantity;
    const deliveredQuantity = this.props.contractData.contract.deliveredQuantity;

    return (
        <Grid className="contract-amount-table">
          <Grid.Row columns={2}>
            <Grid.Column>
              {strings.contractQuantity}
            </Grid.Column>
            <Grid.Column>
              {strings.deliveredQuantity}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row columns={2} style={{ paddingTop: 0 }}>
            <Grid.Column>
              {contractQuantity}
            </Grid.Column>
            <Grid.Column>
              {deliveredQuantity}
            </Grid.Column>
          </Grid.Row>
        </Grid>
    );
  }
}