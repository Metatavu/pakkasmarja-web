import * as React from "react";
import { Modal, Header, Form, Dropdown, Input, TextArea, Button } from "semantic-ui-react";
import { ItemGroup } from "pakkasmarja-client";
import "../../styles/common.css";
import "./styles.css";
import strings from "src/localization/strings";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean,
  closeModal: () => void,
  itemGroups: ItemGroup[],
  selectedBerry: string,
  contractType: string,
  onSelectedBerryChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onQuantityCommentChange: (value: string) => void;
  sendContractProposalClicked: () => void;
  quantity: string,
  quantityComment: string,
  styles?: any
};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean,
  itemGroups: ItemGroup[]
};

/**
 * Contract proposal modal component class
 */
export default class ContractProposalModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      modalOpen: false,
      itemGroups: []
    };
  }

/**
 * Component did update life-cycle event
 */
  public componentDidUpdate = (prevProps:Props) => {
    if(prevProps.contractType !== this.props.contractType){
      const itemGroups = this.props.itemGroups.filter((itemGroup) => itemGroup.category === this.props.contractType);
      this.setState({ itemGroups });
    }
  }

  /**
   * Close modal
   */
  private closeModal = () => {
    this.props.closeModal();
  }

  /**
   * Render method
   */
  public render() {
    const itemGroupOptions = this.state.itemGroups.map((itemGroup) => {
      return {
        key: itemGroup.id,
        text: itemGroup.displayName ? itemGroup.displayName : itemGroup.name,
        value: itemGroup.id
      };
    });
    return (
      <Modal size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            {strings.suggestAnotherContract}
          </Header>
          <Form>
            <Form.Field>
              <p>{strings.berry}:</p>
              <Dropdown
                fluid
                selection
                placeholder={strings.berry}
                value={this.props.selectedBerry}
                options={itemGroupOptions}
                onChange={(event, data) => {
                  const value = data.value ? data.value.toString() : "";
                  this.props.onSelectedBerryChange(value)
                }}
              />
            </Form.Field>
            <Form.Field>
              <p>{strings.amount}:</p>
              <Input
                value={this.props.quantity}
                onChange={(event: any) => this.props.onQuantityChange(event.target.value)}
              />
            </Form.Field>
            <Form.Field>
              <p>{strings.comment}:</p>
              <TextArea
                value={this.props.quantityComment}
                onChange={(event: any) => {
                  this.props.onQuantityCommentChange(event.target.value)
                }}
                placeholder={strings.comment}
              />
            </Form.Field>
          </Form>
          <Button.Group floated="right" className="contract-button-group" >
            <AsyncButton onClick={ this.props.sendContractProposalClicked } color="red">{ strings.send }</AsyncButton>
            <Button.Or text="" />
            <Button onClick={this.closeModal} color="black">{strings.close}</Button>
          </Button.Group>
        </Modal.Content>
      </Modal>
    );
  }
}