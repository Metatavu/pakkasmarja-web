import * as React from "react";
import "../../styles/common.scss";
import { Button } from "semantic-ui-react";
import { Redirect } from "react-router-dom";


/**
 * Interface for component props
 */
interface Props {
  isActiveContract: boolean,
  acceptContract: () => void,
  declineContract: () => void,
  downloadContractPdf?: () => void,
  approveButtonText: string
};

/**
 * Interface for component state
 */
interface State {
  redirect: boolean
};

export default class ContractFooter extends React.Component<Props, State> {
  /**
   * Constructor
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      redirect: false
    };
  }

  /**
   * Render method for contract parties component
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to="/contracts" push={true} />;
    }
    return (
      <React.Fragment>
        {
          this.props.isActiveContract &&
          <Button.Group>
            <Button onClick={this.props.downloadContractPdf} labelPosition='left' icon='left chevron' content='Lataa sopimus PDF - muodossa.' />
            <Button onClick={() => this.setState({ redirect: true })} labelPosition='right' icon='right chevron' content='TAKAISIN' />
          </Button.Group>
        }
        {
          !this.props.isActiveContract &&
          <Button.Group>
            <Button onClick={() => this.setState({ redirect: true })} labelPosition='left' icon='left chevron' content='TAKAISIN' />
            <Button onClick={this.props.declineContract} negative icon='stop' content='EN HYVÄKSY' />
            <Button onClick={this.props.acceptContract} labelPosition='right' icon='right chevron' content={this.props.approveButtonText} />
          </Button.Group>
        }
      </React.Fragment>
    );
  }
}