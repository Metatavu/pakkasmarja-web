import * as React from "react";
import "../../styles/common.css";
import { Button } from "semantic-ui-react";
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
  approveButtonText: string,
  canAccept: boolean,
  errorText?: string
  validationErrorText: string
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
        {
          this.props.errorText &&
          <p style={{ textAlign: "right", color: "red" }}>{this.props.errorText}</p>
        }
        {
          this.props.isActiveContract &&
          <Button.Group floated="right" >
            <Button onClick={this.props.downloadContractPdf} color="red">{strings.downloadContractAsPDF}</Button>
            <Button.Or text="" />
            <Button onClick={() => this.setState({ redirect: true })} color="black">{strings.back}</Button>
          </Button.Group>
        }
        {
          !this.props.isActiveContract &&
          <React.Fragment>
            <p style={{ color: "red", textAlign: "right", fontSize: "1.2em" }}>{this.props.validationErrorText}</p>
            <Button.Group floated="right" >
              <Button onClick={this.props.acceptContract} disabled={(!this.props.canAccept || !!this.props.validationErrorText )} color="red">{this.props.approveButtonText}</Button>
              <Button.Or text="" />
              <Button onClick={this.props.declineContract} inverted color="red">{strings.decline}</Button>
              <Button.Or text="" />
              <Button onClick={() => this.setState({ redirect: true })} color="black">{strings.back}</Button>
            </Button.Group>
          </React.Fragment>
        }
      </React.Fragment>
    );
  }
}