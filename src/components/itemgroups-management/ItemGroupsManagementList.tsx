import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, ItemGroupTableData } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import Api, { ItemGroupDocumentTemplate } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, List, Dimmer, Loader, Button } from "semantic-ui-react";
import { Table } from 'semantic-ui-react';
import { Link, Redirect } from "react-router-dom";
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
  itemGroupData: ItemGroupTableData[];
  itemgroupsLoading: boolean;
  errorMessage?: string;
  selectedItemGroupDocumentTemplate?: {
    itemGroup: ItemGroup,
    itemGroupDocumentTemplate: ItemGroupDocumentTemplate
  };
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
      itemGroupData: [],
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

    this.setState({ itemgroupsLoading: true, selectedItemGroupDocumentTemplate: undefined });
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
    
    const itemGroupsAndItemGroupDocumentTemplates = await Promise.all(itemGroups.map((itemGroup): Promise<ItemGroupTableData | null> => {
      return this.loadItemGroupAndItemGroupTemplate(itemGroup);
    }));

    const itemGroupData: ItemGroupTableData[] = itemGroupsAndItemGroupDocumentTemplates.filter((itemGroupData): itemGroupData is ItemGroupTableData => itemGroupData !== null);

    await this.setState({ 
      itemGroupData: itemGroupData
    });
  }

  /**
   * Load item group and item group template
   * 
   * @param itemGroup item group
   * 
   * @return object with item group and item group templates
   */
  private loadItemGroupAndItemGroupTemplate = async (itemGroup: ItemGroup): Promise<ItemGroupTableData | null> => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return null;
    }
    
    const documentTemplateService = await Api.getItemGroupsService(this.props.keycloak.token);
    const templates = await documentTemplateService.listItemGroupDocumentTemplates(itemGroup.id || "");

    return {
      itemGroup: itemGroup,
      itemGroupTemplates: templates
    };
  }

  /**
   * Format item group document template type
   * 
   * @param itemGroupDocumentTemplate item group document template
   * 
   * @return type
   */
  private formatItemGroupDocumentTemplateType = (itemGroupDocumentTemplate: ItemGroupDocumentTemplate) => {
    const type = itemGroupDocumentTemplate.type;

    switch (type) {
      case "master":
        return "Pääsopimus";
      case "group":
        return "Ryhmä";
    }

    return type;
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

    if (this.state.selectedItemGroupDocumentTemplate) {
      const itemGroupId = this.state.selectedItemGroupDocumentTemplate.itemGroup.id;
      const templateId = this.state.selectedItemGroupDocumentTemplate.itemGroupDocumentTemplate.id;
      <Redirect to={{
          pathname: `/itemGroups/${itemGroupId}/contractDocumentTemplate/${templateId}`
        }}
      />
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
                <Button as={Link} to="createItemGroup" color="red" style={{ width: "100%" }}>
                  Uusi marjalaji
                </Button>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.itemGroupData.map((itemGroupData: ItemGroupTableData) => {
                return (
                  <Table.Row key={itemGroupData.itemGroup.id}>
                    <Table.Cell>
                      {itemGroupData.itemGroup.name}
                    </Table.Cell>
                    <Table.Cell >
                      <List>
                        <List.Item>
                          <List.Content as={Link} to={`/createAndEditItemGroupPrices/${itemGroupData.itemGroup.id}`}>
                            <p className="plink">Muokkaa hintoja</p>
                          </List.Content>
                        </List.Item>
                          {
                            itemGroupData.itemGroupTemplates.map((itemGroupDocumentTemplate) => {
                              return (
                                <List.Item key={itemGroupDocumentTemplate.id}>
                                  <List.Content 
                                    as={Link}
                                    to={`/itemGroups/${itemGroupData.itemGroup.id}/contractDocumentTemplate/${itemGroupDocumentTemplate.id}`}
                                  >
                                    <p className="plink">
                                      {`Muokkaa sopimusmallia ${this.formatItemGroupDocumentTemplateType(itemGroupDocumentTemplate)}`}
                                    </p>
                                  </List.Content>
                                </List.Item>
                              );
                            })
                          }
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
