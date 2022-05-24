import * as React from "react";
import "../../styles/common.css";
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
 * Class for contract parties component
 */
export default class ContractParties extends React.Component<Props> {

  /**
   * Render method
   */
  public render = () => {
    const { contact, companyName, companyBusinessId } = this.props;

    if (!contact) {
      return <div></div>;
    }

    const farmerDisplayName = contact.companyName ?? `${contact.firstName} ${contact.lastName}`;

    return (
      <div className="contract-white-container">
        <Header as="h2">
          { strings.parties }
        </Header>
        <Grid>
          <Grid.Row columns="2">
            <Grid.Column>
              <p className="font-bold">
                { strings.farmer }
              </p>
            </Grid.Column>
            <Grid.Column>
              <p className="font-bold">
                { strings.company }
              </p>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row
            columns="2"
            style={{ paddingTop: 0 }}
          >
            <Grid.Column>
              <p>{ farmerDisplayName }</p>
              <p>{ contact.sapId }</p>
            </Grid.Column>
            <Grid.Column>
              <p>{ companyName }</p>
              <p>{ companyBusinessId }</p>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </div>
    );
  }
}