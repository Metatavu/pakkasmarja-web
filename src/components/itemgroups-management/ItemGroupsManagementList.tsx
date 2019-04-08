import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import Api from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, List, Dimmer, Loader } from "semantic-ui-react";
import { Table } from 'semantic-ui-react';
import { Link } from "react-router-dom";
import BasicLayout from "../generic/BasicLayout";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  itemGroups: ItemGroup[];
  itemgroupsLoading: boolean;
  errorMessage?: string;
}

/**
 * Class for itemgroups list component
 */
class ItemGroupsManagementList extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      itemGroups: [],
      itemgroupsLoading: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ itemgroupsLoading: true });
    await this.loadItemGroups();
    this.setState({ itemgroupsLoading: false });
  }

  /**
   * Load item groups
   */
  private loadItemGroups = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroups = await itemGroupsService.listItemGroups();
    await this.setState({ itemGroups: itemGroups });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.itemgroupsLoading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan marjalajeja
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <BasicLayout>
        <Header floated='left' className="contracts-header">
          <p>Marjalajit</p>
        </Header>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={13}>
                Marjalajin nimi
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.itemGroups.map((itemGroup: ItemGroup) => {
                return (
                  <Table.Row key={itemGroup.id}>
                    <Table.Cell>
                      {itemGroup.name}
                    </Table.Cell>
                    <Table.Cell >
                      <List>
                        <List.Item>
                          <List.Content as={Link} to={`/createAndEditItemGroupPrices/${itemGroup.id}`}>
                            <p className="plink">Muokkaa hintoja</p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content as={Link} to={`/editItemGroupDocument/${itemGroup.id}`}>
                            <p className="plink">{`Muokkaa sopimusmallia`}</p>
                          </List.Content>
                        </List.Item>
                      </List>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            }
          </Table.Body>
        </Table>
      </BasicLayout>
    );
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ItemGroupsManagementList);
