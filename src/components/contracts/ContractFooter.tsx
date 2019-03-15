import * as React from "react";
import "../../styles/common.scss";
import { Button, Divider } from "semantic-ui-react";
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
        <Divider/>
        {
          this.props.isActiveContract &&
          <Button.Group floated="right" >
            <Button onClick={this.props.downloadContractPdf} color="red">Lataa sopimus PDF - muodossa.</Button>
            <Button.Or text="" />
            <Button  onClick={() => this.setState({ redirect: true })}  color="black">TAKAISIN</Button>
          </Button.Group>
        }
        {
          !this.props.isActiveContract &&
          <Button.Group floated="right" >
            <Button onClick={this.props.acceptContract} color="red">{this.props.approveButtonText}</Button>
            <Button.Or text="" />
            <Button  onClick={this.props.declineContract} inverted color="red">EN HYVÄKSY</Button>
            <Button.Or text="" />
            <Button onClick={() => this.setState({ redirect: true })}  color="black">TAKAISIN</Button>
          </Button.Group>
        }
      </React.Fragment>
    );
  }
}