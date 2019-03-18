import * as React from "react";
import { Modal, Header, Form, Dropdown, Input, TextArea, Button } from "semantic-ui-react";
import { ItemGroup } from "pakkasmarja-client";
import "../../styles/common.scss";
import "./styles.scss";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean,
  closeModal: () => void,
  itemGroups: ItemGroup[],
  selectedBerry: string,
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
      modalOpen: false
    };
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
    const itemGroupOptions = this.props.itemGroups.map((itemGroup) => {
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
            Ehdota sopimusta jostain muusta marjasta
          </Header>
          <Form>
            <Form.Field>
              <p>Marja:</p>
              <Dropdown
                fluid
                selection
                placeholder="Valitse marja"
                value={this.props.selectedBerry}
                options={itemGroupOptions}
                onChange={(event, data) => {
                  const value = data.value ? data.value.toString() : "";
                  this.props.onSelectedBerryChange(value)
                }}
              />
            </Form.Field>
            <Form.Field>
              <p>Määrä:</p>
              <Input
                value={this.props.quantity}
                onChange={(event: any) => this.props.onQuantityChange(event.target.value)}
              />
            </Form.Field>
            <Form.Field>
              <p>Kommentti:</p>
              <TextArea
                value={this.props.quantityComment}
                onChange={(event: any) => {
                  this.props.onQuantityCommentChange(event.target.value)
                }}
                placeholder="Kommentti"
              />
            </Form.Field>
          </Form>
          <Button.Group floated="right" className="contract-button-group" >
            <Button onClick={this.closeModal} inverted color="red">Sulje</Button>
            <Button.Or text="" />
            <Button onClick={this.props.sendContractProposalClicked} color="black">Lähetä</Button>
          </Button.Group>
        </Modal.Content>
      </Modal>
    );
  }
}