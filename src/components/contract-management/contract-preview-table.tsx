import * as React from "react";

import { Icon, Popup, Table } from "semantic-ui-react";
import { Contract, ContractPreviewData, ImportedContractError } from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Component props
 */
interface Props {
  /**
   * Parsed xlsx objects
   */
  contractPreviews: ContractPreviewData[];
  error?: boolean;
}

/**
 * Component state
 */
interface State { }

/**
 * Class for displaying contracts preview table
 */
class ContractPreviewTable extends React.Component<Props, State> {

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
    return (
      <Table style={{ fontSize: 15 }}>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{ strings.contactSapId }</Table.HeaderCell>
            <Table.HeaderCell>{ strings.itemGroupSapId }</Table.HeaderCell>
            <Table.HeaderCell>{ strings.contractQuantity }</Table.HeaderCell>
            <Table.HeaderCell>{ strings.quantityComment }</Table.HeaderCell>
            <Table.HeaderCell>{ strings.oneHundredPercentDelivery }</Table.HeaderCell>
            <Table.HeaderCell>{ strings.deliveryPlaceSapId }</Table.HeaderCell>
            <Table.HeaderCell>{ strings.deliveryPlaceComment }</Table.HeaderCell>
            <Table.HeaderCell>{ strings.remarkFieldSap }</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          { this.renderTableCells() }
        </Table.Body>
      </Table>
    );
  }

  /**
   * Method for rendering table cells
   */
  private renderTableCells = () => {
    const { contractPreviews } = this.props;

    return contractPreviews.map((preview, index) => {
      const importedContract = preview.importedContract;

      if (!importedContract) {
        return null;
      }

      return (
        <Table.Row key={ index } error={ this.props.error }>
          <Table.Cell>
            <>
              { importedContract.contactName }
              { this.renderError("contactId", preview.errors) }
            </>
          </Table.Cell>
          <Table.Cell>
            <>
              { importedContract.itemGroupName }
              { this.renderError("itemGroupId", preview.errors) }
            </>
          </Table.Cell>
          <Table.Cell>
            <>
              { importedContract.contractQuantity }
              { this.renderError("contractQuantity", preview.errors) }
            </>
          </Table.Cell>
          <Table.Cell>
            <>
              { importedContract.quantityComment }
              { this.renderError("quantityComment", preview.errors) }
            </>
          </Table.Cell>
          <Table.Cell>
            <>
              { importedContract.deliverAll }
              { this.renderError("deliverAll", preview.errors) }
            </>
          </Table.Cell>
          <Table.Cell>
            <>
              { importedContract.deliveryPlaceName }
              { this.renderError("deliveryPlaceId", preview.errors) }
            </>
          </Table.Cell>
          <Table.Cell>
            <>
              { importedContract.deliveryPlaceComment }
              { this.renderError("deliveryPlaceComment", preview.errors) }
            </>
          </Table.Cell>
          <Table.Cell>
            <>
              { importedContract.remarks }
              { this.renderError("remarks", preview.errors) }
            </>
          </Table.Cell>
        </Table.Row>
      );
    });
  }

  /**
   * Method for rendering error
   *
   * @param key key of contract object
   * @param errors imported contract error array
   */
  private renderError = (key: keyof Contract, errors: ImportedContractError[]) => {
    const error = errors.find(err => err.key === key);

    if (!error) {
      return null;
    }

    return (
      <Popup
        content={ error.message }
        trigger={ <Icon color="red" name="exclamation triangle" /> }
      />
    );
  }

}

export default ContractPreviewTable;