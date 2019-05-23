import * as React from "react";
import "../../styles/common.css";
import { Header, Table } from "semantic-ui-react";
import { ContractTableData } from "../../types";
import ContractItem from "./ContractItem";
import strings from "../../localization/strings";

/**
 * Interface for component State
 */
interface Props {
  contractDatas: ContractTableData[];
  header: string;
  contractState?: string;
}

/**
 * Interface for component State
 */
interface State {
}

/**
 * Class for contract list container component
 */
export default class ContractListContainer extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      open: false,
      redirect: false
    };
  }

  /**
   * Render method
   */
  public render() {

    if (this.props.contractState == "active") {
      return (
        <div className="contract-blue-container">
          <Header as="h3"> {this.props.header}</Header>
          <Table style={{ backgroundColor: "transparent", border: "0" }} padded fixed>
            <Table.Header >
              <Table.Row>
                <Table.HeaderCell width={4} style={{ backgroundColor: "transparent", color:"black" }}>{strings.berry}</Table.HeaderCell>
                <Table.HeaderCell width={5} style={{ backgroundColor: "transparent", color:"black" }}>{strings.deliveredQuantity}</Table.HeaderCell>
                <Table.HeaderCell width={5} style={{ backgroundColor: "transparent", color:"black" }}>{strings.contractQuantity}</Table.HeaderCell>
                <Table.HeaderCell textAlign="center" width={2} style={{ backgroundColor: "transparent" }}>{strings.downloadPdf}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {
                this.props.contractDatas.map((data) => {
                  return <ContractItem key={data.contract.id} contractData={data} />;
                })
              }
            </Table.Body>
          </Table>
        </div>
      );
    } else {
      return (
        <div className="contract-blue-container">
          <Header as="h3"> {this.props.header}</Header>
          <Table style={{ backgroundColor: "transparent", border: "0" }} padded fixed>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell width={4} style={{ backgroundColor: "transparent", color:"black" }}>{strings.berry}</Table.HeaderCell>
                <Table.HeaderCell width={10}  style={{ backgroundColor: "transparent", color:"black" }}>{strings.status}</Table.HeaderCell>
                <Table.HeaderCell width={2}  style={{ backgroundColor: "transparent" }}></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {
                this.props.contractDatas.map((data) => {
                  return <ContractItem key={data.contract.id} contractData={data} />;
                })
              }
            </Table.Body>
          </Table>
        </div>
      );
    }
  }
}
