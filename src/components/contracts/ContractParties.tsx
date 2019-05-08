import * as React from "react";
import "../../styles/common.scss";
import { Grid, Header } from "semantic-ui-react";
import { Contact } from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Interface for component State
 */
interface Props {
  contact?: Contact;
  companyName: string;
  companyBusinessId: string
}

/**
 * Interface for component State
 */
interface State {
}

/**
 * Class for contract parties component
 */
export default class ContractParties extends React.Component<Props, State> {

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
    if (!this.props.contact) {
      return <div></div>;
    }

    const farmerCompanyName = this.props.contact.companyName;
    const farmerFirstName = this.props.contact.firstName;
    const farmerLastName = this.props.contact.lastName;

    return (
      <div className="contract-white-container">
          <Header as='h2'>
            {strings.parties}
         </Header>
        <Grid>
          <Grid.Row columns="2">
            <Grid.Column>
              <p className="font-bold">{strings.farmer}</p>
            </Grid.Column>
            <Grid.Column>
              <p className="font-bold">{strings.company}</p>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row columns="2" style={{paddingTop:0}}>
            <Grid.Column>
              <p>
                {farmerCompanyName ? farmerCompanyName : `${farmerFirstName} ${farmerLastName}`}
              </p>
            </Grid.Column>
            <Grid.Column>
              <p>
                {this.props.companyName}
              </p>
              <p>
                {this.props.companyBusinessId}
              </p>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </div>
    );
  }
}