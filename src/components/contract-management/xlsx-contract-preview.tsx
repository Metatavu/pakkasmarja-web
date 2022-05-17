import * as React from "react";

import strings from "src/localization/strings";
import ContractPreviewTable from "./contract-preview-table";
import { Button, Dimmer, Loader, Modal } from "semantic-ui-react";
import { Contract, ContractPreviewData } from "pakkasmarja-client";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Component props
 */
interface Props {
  /**
   * Component visible
   */
  open: boolean;
  /**
   * Parsed xlsx objects
   */
  parsedXlsxObjects: ContractPreviewData[];
  /**
   * Contract object cancelled
   */
  onCancel: () => void;
  /**
   * Contract object accepted
   */
  onAccept: (contracts: Contract[]) => void;
}

/**
 * Component state
 */
interface State { }

/**
 * Class for displaying xlsx contract preview
 */
class XlsxContractsPreview extends React.Component<Props, State> {

  /**
   * Component constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = { };
  }

  /**
   * Component render
   */
  public render = () => {
    const { open, onCancel, parsedXlsxObjects } = this.props;

    return (
      <Modal
        open={ open }
        onClose={ onCancel }
        style={{ width: "100%", height: "100%", overflow: "scroll" }}
      >
        <Modal.Header>{ strings.contractPreview }</Modal.Header>
        <Modal.Content>
          { parsedXlsxObjects.length > 0 ?
            <ContractPreviewTable parsedXlsxObjects={ parsedXlsxObjects } /> :
            <Dimmer active inverted>
              <Loader indeterminate>{ strings.gatheringContracts }</Loader>
            </Dimmer>
          }
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={ onCancel }>
            { strings.cancel }
          </Button>
          <AsyncButton
            color="red"
            icon='checkmark'
            labelPosition='right'
            content={ strings.accept }
            onClick={ this.accept }
            disabled={ this.hasErrors() }
          />
        </Modal.Actions>
      </Modal>
    );
  }

  /**
   * Method for checking if there are
   * errors in imported contracts
   *
   * @returns boolean
   */
  private hasErrors = (): boolean => {
    const { parsedXlsxObjects } = this.props;
    return parsedXlsxObjects.some(object => object.errors.length);
  }

  /**
   * Method for accepting xlsx parsed contracts
   */
  private accept = () => {
    const { onAccept, parsedXlsxObjects } = this.props;

    onAccept(parsedXlsxObjects.map(object => object.contract));
  }
}

export default XlsxContractsPreview;
