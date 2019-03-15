import * as React from "react";
import "../../styles/common.scss";
import { Input, Header, Form, Checkbox, TextArea, Modal, Grid, Divider } from "semantic-ui-react";
import { Contract, ItemGroup } from "pakkasmarja-client";

/**
 * Interface for component State
 */
interface Props {
  itemGroup?: ItemGroup;
  contract?: Contract;
  contracts?: Contract[];
  onUserInputChange: (key: any, value: any) => void;
  proposedAmount: number;
  contractAmount?: number;
  quantityComment: string;
  deliverAllChecked: boolean;
}

/**
 * Interface for component State
 */
interface State {
  showPastContracts: boolean;
  isActiveContract: boolean;
  pastContracts: Contract[];
}

/**
 * Class for contract item component
 */
export default class ContractAmount extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      showPastContracts: false,
      isActiveContract: false,
      pastContracts: []
    };
  }

  /**
   * Component did mount 
   */
  public componentDidMount = () => {
    if (!this.props.contract || !this.props.contracts) {
      return;
    }
    this.setState({ isActiveContract: this.props.contract.status === "APPROVED" });
    const pastContracts = this.props.contracts.filter(contract => contract.year < new Date().getFullYear());
    console.log("PAST", pastContracts);
    this.setState({ pastContracts: pastContracts });
  }

  /**
   * Render method
   */
  public render() {
    if (!this.props.contract || !this.props.itemGroup) {
      return <div></div>;
    }

    const category = this.props.itemGroup.category;
    let quantityValue = 0;

    if (this.props.contractAmount && !this.props.proposedAmount) {
      quantityValue = this.props.contractAmount;
    } else {
      quantityValue = this.props.proposedAmount;
    }

    return (
      <div className="contract-section">
        <Divider horizontal>
          <Header as='h2'>
            Määrä
         </Header>
        </Divider>
        {
          category == "FRESH" &&
          <p>
            Tuoremarjasopimuksessa sopimusmäärä on aiesopimus, johon molemmat osapuolet sitoutuvat, ellei kyseessä poikkeustilanne.
            </p>
        }
        <Form>
          <Form.Field>
            <label>Määrä</label>
            <Input
              placeholder="Määrä"
              value={quantityValue}
              onChange={(event: any) => this.props.onUserInputChange("proposedQuantity", event.target.value)}
              disabled={this.state.isActiveContract}
            />
          </Form.Field>
          <p>
            {`Pakkasmarjan ehdotus: ${this.props.contract.contractQuantity} kg`}
          </p>
          <p onClick={() => this.setState({ showPastContracts: true })}>
            Näytä edellisten vuosien sopimusmäärät ja toimitusmäärät
          </p>
          <Form.Field>
            <Checkbox
              checked={this.props.deliverAllChecked}
              onChange={(event: any) => {
                !this.state.isActiveContract && this.props.onUserInputChange("deliverAllChecked", !this.props.deliverAllChecked)
              }}
              label={"Haluaisin toimittaa kaiken tilallani viljeltävän sadon tästä marjasta Pakkasmarjalle pakastettavaksi ja tuorekauppaan (lisätietoja sopimuksen kohdasta 100 % toimittajuus)."}
            />
          </Form.Field>
          <Form.Field>
            <TextArea
              value={this.props.quantityComment}
              onChange={(event: any) => {
                !this.state.isActiveContract && this.props.onUserInputChange("quantityComment", event.target.value)
              }}
              placeholder="Kommentti"
            />
          </Form.Field>
        </Form>
        <Modal open={this.state.showPastContracts} onClose={() => this.setState({ showPastContracts: false })} closeIcon>
          <Modal.Header>Edellisten vuosien sopimusmäärät ja toimitusmäärät</Modal.Header>
          <Modal.Content>
            <Grid>
              <Grid.Row columns="3">
                <Grid.Column>
                  Vuosi
                </Grid.Column>
                <Grid.Column>
                  Sovittu määrä (kg)
                </Grid.Column>
                <Grid.Column>
                  Toteutunut määrä (kg)
                </Grid.Column>
              </Grid.Row>
              {
                this.state.pastContracts.map((contract) => {
                  return (
                    <Grid.Row key={contract.id} columns="3">
                      <Grid.Column>
                        {contract.year}
                      </Grid.Column>
                      <Grid.Column>
                        {contract.contractQuantity}
                      </Grid.Column>
                      <Grid.Column>
                        {contract.deliveredQuantity}
                      </Grid.Column>
                    </Grid.Row>
                  );
                })
              }
            </Grid>
          </Modal.Content>
        </Modal>
      </div>
    );
  }
}