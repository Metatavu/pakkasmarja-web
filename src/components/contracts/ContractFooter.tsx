import * as React from "react";
import "../../styles/common.scss";
import { Button, Divider } from "semantic-ui-react";
import { Redirect } from "react-router-dom";
import strings from "src/localization/strings";


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

/**
 * Class for contact footer component
 */
export default class ContractFooter extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
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
            <Button onClick={this.props.downloadContractPdf} color="red">{strings.downloadContractAsPDF}</Button>
            <Button.Or text="" />
            <Button  onClick={() => this.setState({ redirect: true })}  color="black">{strings.back}</Button>
          </Button.Group>
        }
        {
          !this.props.isActiveContract &&
          <Button.Group floated="right" >
            <Button onClick={this.props.acceptContract} color="red">{this.props.approveButtonText}</Button>
            <Button.Or text="" />
            <Button  onClick={this.props.declineContract} inverted color="red">{strings.decline}</Button>
            <Button.Or text="" />
            <Button onClick={() => this.setState({ redirect: true })}  color="black">{strings.back}</Button>
          </Button.Group>
        }
      </React.Fragment>
    );
  }
}