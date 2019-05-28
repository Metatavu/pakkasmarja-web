import * as React from "react";
import "../../styles/common.css";
import { Input, Header, Form, Checkbox, TextArea, Modal, Grid, Icon } from "semantic-ui-react";
import { Contract, ItemGroup } from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Interface for component State
 */
interface Props {
  itemGroup: ItemGroup;
  contract: Contract;
  contracts: Contract[];
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
  isReadOnly: boolean;
  pastContracts: Contract[];
}

/**
 * Class for contract amount component
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
      isReadOnly: false,
      pastContracts: []
    };
  }

  /**
   * Component did mount 
   */
  public componentDidMount = () => {
    this.setState({ isReadOnly: this.props.contract.status !== "DRAFT" });
    const pastContracts = this.props.contracts.filter(contract => contract.year < new Date().getFullYear());
    this.setState({ pastContracts: pastContracts });
  }

  /**
   * Render method
   */
  public render() {
    const category = this.props.itemGroup.category;
    const quantityValue = this.props.proposedAmount || this.props.contractAmount;

    return (
      <div className="contract-blue-container">
        <Header as='h2'>
          {strings.amount}
        </Header>
        {
          category == "FRESH" &&
          <p>
            {strings.amountInfoTextFresh}
          </p>
        }
        <Form>
          <Form.Field>
            <label>{strings.amount}</label>
            <Input
              placeholder={strings.amount}
              value={quantityValue}
              onChange={(event: any) => this.props.onUserInputChange("proposedQuantity", event.target.value)}
              disabled={this.state.isReadOnly}
            />
          </Form.Field>
          <p>
            Pakkasmarjan ehdotus: <strong>{this.props.contract.contractQuantity} kg</strong>
          </p>
          <p className="open-modal-element" style={{ color: "blue", paddingBottom: 10 }} onClick={() => this.setState({ showPastContracts: true })}>
            <Icon color="red" name='info circle' />
            {strings.showPastYearAmounts}
          </p>
          <Form.Field>
            <Checkbox
              checked={this.props.deliverAllChecked}
              onChange={(event: any) => {
                !this.state.isReadOnly && this.props.onUserInputChange("deliverAllChecked", !this.props.deliverAllChecked)
              }}
              label={strings.wantToDeliverAll}
            />
          </Form.Field>
          <Form.Field>
            <TextArea
              value={this.props.quantityComment}
              onChange={(event: any) => {
                !this.state.isReadOnly && this.props.onUserInputChange("quantityComment", event.target.value)
              }}
              placeholder={strings.comment}
            />
          </Form.Field>
        </Form>
        <Modal open={this.state.showPastContracts} onClose={() => this.setState({ showPastContracts: false })} closeIcon>
          <Modal.Header>{strings.pastYearAmounts}</Modal.Header>
          <Modal.Content>
            <Grid>
              <Grid.Row columns="3">
                <Grid.Column>
                  {strings.year}
                </Grid.Column>
                <Grid.Column>
                  {strings.contractAmount}
                </Grid.Column>
                <Grid.Column>
                  {strings.deliveriedAmount}
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