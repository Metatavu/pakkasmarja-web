import * as _ from "lodash";
import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { DeliveryPlace, Product, Contact, Delivery, DeliveryQuality, DataSheet } from "pakkasmarja-client";
import { Dimmer, Loader, Modal, Button, Input, Image, Icon, Popup, Form } from "semantic-ui-react";
import { Table } from 'semantic-ui-react';
import BasicLayout from "../generic/BasicLayout";
import * as moment from "moment";
import TableBasicLayout from "../contract-management/TableBasicLayout";
import ManageDeliveryModal from "./ManageDeliveryModal";
import DatePicker, { registerLocale } from "react-datepicker";
import fi from 'date-fns/esm/locale/fi'
import IncomingDeliveryIcon from "../../gfx/incoming-delivery-icon.png";
import "./styles.css"
import CreateDeliveryModal from "./CreateDeliveryModal";
import StorageDataTable from "./StorageTable";
import TableDataUtils from "../../utils/table-data-utils";
import SalesForecastDataTable from "./SalesForecastTable";
import AppConfig from "../../utils/AppConfig";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean
  keycloak?: Keycloak.KeycloakInstance
}

/**
 * Interface for component state
 */
interface State {
  selectedDate: Date
  loading: boolean
  deliveryPlace: DeliveryPlace,
  deliveryPlaceId: string,
  deliveryPlaces: DeliveryPlace[],
  products: Product[],
  deliveries: Delivery[],
  selectedDelivery?: Delivery
  proposalProduct?: Product,
  proposalContactId?: string,
  proposalTime?: number,
  proposalAmount?: number
  addingProposal: boolean,
  contacts: Contact[]
  deliveryQualities: { [key: string]: DeliveryQuality },
  newDeliveryModalOpen: boolean,
  error?: string,
  storageDataSheet?: DataSheet,
  morningSalesForecastDataSheet?: DataSheet,
  eveningSalesForecastDataSheet?: DataSheet,
}

/**
 * Class for itemgroups list component
 */
class FreshDeliveryManagement extends React.Component<Props, State> {

  private pollInterval: any;

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      deliveryPlaces: [],
      deliveryPlace: { },
      products: [],
      deliveries: [],
      contacts: [],
      selectedDate: new Date(),
      addingProposal: false,
      deliveryQualities: {},
      newDeliveryModalOpen: false,
      deliveryPlaceId: ""
    };
    registerLocale('fi', fi);
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return;
    }

    this.setState({ loading: true });

    const appConfig = await AppConfig.getAppConfig();
    const deliveryPlaceId = appConfig.delivery["fresh-delivery-place-id"];
    if (!deliveryPlaceId) {
      throw new Error("Invalid configuration. Missing delivery place id");
    }

    const deliveryPlace = await Api.getDeliveryPlacesService(keycloak.token).findDeliveryPlace(deliveryPlaceId);
    const products = await Api.getProductsService(keycloak.token).listProducts(undefined, "FRESH", undefined, 0, 999);
    const deliveryQualities = await Api.getDeliveryQualitiesService(keycloak.token).listDeliveryQualities("FRESH");
    const deliveryPlaces = await Api.getDeliveryPlacesService(keycloak.token).listDeliveryPlaces();
    
    this.loadDataSheets();
    this.updateTableData();

    this.setState({
      loading: false,
      deliveryPlace: deliveryPlace,
      deliveryPlaces: deliveryPlaces,
      products: products,
      deliveryQualities: _.keyBy(deliveryQualities, "id"),
      deliveryPlaceId: deliveryPlaceId
    });

    this.pollInterval = setInterval(() => {
      return this.reloadDeliveries();
    }, 10000);
  }

  /**
   * Component will unmount life-sycle event
   */
  public componentWillUnmount = async () => {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  public async componentDidUpdate(prevProps: Props, prevState: State) {
    const { selectedDate } = this.state;
    const isSameDay = moment(selectedDate).isSame(prevState.selectedDate, "day");
    if (!isSameDay) {
      this.loadDataSheets();
      this.updateTableData();
    }
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading) {
      return (
        <BasicLayout pageTitle="Päiväennuste, tuoreet">
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan...
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    const { products, deliveries } = this.state;
    const cellWidth = 100 / (products.length + 1);

    const productHeaderCells = products.map((product) => {
      return (
        <Table.HeaderCell style={{ "width": `${cellWidth}%` }} key={product.id}>{product.name}</Table.HeaderCell>
      );
    });

    const morningDeliveries = this.state.deliveries.filter((delivery) => moment(delivery.time).utc().hour() <= 12);
    const eveningDeliveries = this.state.deliveries.filter((delivery) => moment(delivery.time).utc().hour() > 12);

    let tableRows = this.getTableRows(true, morningDeliveries, 0);

    tableRows.push(this.getTableSummaryRow("morning", "#44c336", morningDeliveries, "Klo 12 mennessä yht."));
    tableRows = tableRows.concat(this.getTableRows(false, eveningDeliveries, tableRows.length));
    tableRows.push(this.getTableSummaryRow("now", "#44c336", deliveries, "Varastossa nyt", true));
    tableRows.push(this.getTableSummaryRow("total", "#0ab130", deliveries, "Klo 17 mennessä yht."));
    
    return (
      <TableBasicLayout topBarButtonText={ "+ Uusi ehdotus viljelijälle" } onTopBarButtonClick={() => this.setState({ newDeliveryModalOpen: true }) } error={this.state.error} onErrorClose={() => this.setState({ error: undefined })} pageTitle="Päiväennuste, tuoreet">
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ display: "flex", flex: 1, justifyContent: "center", padding: 10, fontSize: "1.5em" }}><p>Valitse päivämäärä</p></div>
          <div style={{ display: "flex", flex: 1, flexDirection: "row" }}>
            
            <div style={{ display: "flex", flex: 1, justifyContent: "center" }}>
              <Form>
                <Form.Field>
                  <DatePicker
                    onChange={(date: Date) => {
                      this.setState({
                        selectedDate: date
                      });
                    }}
                    selected={this.state.selectedDate}
                    locale="fi"
                  />
                </Form.Field>
              </Form>
            </div>
            
          </div>
        </div>
        {
          this.renderStorageTable()
        }
        {
          <Table celled padded selectable>
            <Table.Header>
              <Table.Row className="table-header-row">
                <Table.HeaderCell key="viljelija">Viljelijä</Table.HeaderCell>
                { productHeaderCells }
              </Table.Row>
            </Table.Header>
            <Table.Body>
              { tableRows }
            </Table.Body>
          </Table>
        }
        {
          this.renderMorningSalesForecastTable()
        }
        {
          this.renderEveningSalesForecastTable()
        }
        {
          this.renderSummaries()
        }
        {
          this.state.selectedDelivery &&
          <ManageDeliveryModal
            onError={this.handleError}
            onUpdate={() => { this.setState({ selectedDelivery: undefined }); this.updateTableData(); }}
            onClose={() => this.setState({ selectedDelivery: undefined })}
            open={true}
            delivery={this.state.selectedDelivery} 
            category="FRESH"
            />
        }
        {
          this.state.proposalContactId && this.state.proposalProduct && this.state.proposalTime &&
          <Modal size="tiny" open={true} onClose={() => this.setState({ proposalContactId: undefined, proposalProduct: undefined })}>
            <Modal.Header>Luo toimitusehdotus</Modal.Header>
            <Modal.Content>
              <p>Syötä ehdotettava määrä</p>
              <Input value={this.state.proposalAmount} type="number" onChange={(e, data) => { this.setState({ proposalAmount: parseInt(data.value, 10) }) }} />
            </Modal.Content>
            <Modal.Actions>
              <Button onClick={() => this.setState({ proposalContactId: undefined, proposalProduct: undefined })} negative>Peruuta</Button>
              <Button onClick={() => this.addProposal()} loading={this.state.addingProposal} positive icon='checkmark' labelPosition='right' content='Tee ehdotus' />
            </Modal.Actions>
          </Modal>
        }
        {
          <CreateDeliveryModal
            deliveryPlaces={ this.state.deliveryPlaces }
            open={this.state.newDeliveryModalOpen}
            onClose={(created?: boolean) => {
              this.setState({ newDeliveryModalOpen: false });
              if (created) {
                this.reloadDeliveries();
              }
            }}
            products={this.state.products}
            date={this.state.selectedDate}
            deliveryPlaceId={ this.state.deliveryPlaceId }
          />
        }
      </TableBasicLayout >
    );
  }

  /**
   * Loads data sheets
   */
  private loadDataSheets = async () => {
    const { selectedDate } = this.state;
    const formattedDate = moment(selectedDate).format("YYYY-MM-DD");

    this.setState({ 
      loading: true,
      storageDataSheet: undefined,
      morningSalesForecastDataSheet: undefined,
      eveningSalesForecastDataSheet: undefined
    });

    const storageDataSheet = await this.prepareDataSheet(await this.findOrCreateDataSheet(`fresh-storage-${formattedDate}`));
    const morningSalesForecastDataSheet = await this.prepareDataSheet(await this.findOrCreateDataSheet(`fresh-morning-sales-forecast-${formattedDate}`));
    const eveningSalesForecastDataSheet = await this.prepareDataSheet(await this.findOrCreateDataSheet(`fresh-evening-sales-forecast-${formattedDate}`));

    this.setState({
      loading: false,
      storageDataSheet: storageDataSheet,
      morningSalesForecastDataSheet: morningSalesForecastDataSheet,
      eveningSalesForecastDataSheet: eveningSalesForecastDataSheet
    });
  }

  /**
   * Finds or create datasheet by given name
   * 
   * @param name
   * @return data sheet
   */
  private findOrCreateDataSheet = async (name: string): Promise<DataSheet> => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      throw new Error("Not logged in");
    }

    const dataSheetsService = Api.getDataSheetsService(keycloak.token);
    const sheets = await dataSheetsService.listDataSheets(name);
    if (sheets.length) {
      return sheets[0];
    } else {
      return await dataSheetsService.createDataSheet({
        data: [],
        name: name
      });
    }
  }

  /**
   * Renders storage value
   */
  private renderStorageTable = () => {
    if (!this.state.storageDataSheet) {
      return null;
    }

    const qualities = _.values(this.state.deliveryQualities);

    return <StorageDataTable
      products={ this.state.products } 
      qualities={ qualities } 
      getCellValue={ this.getStorageTableValue }
      onApplyValue={ this.onApplyStorageTableValue }/>
  }

  /**
   * Renders morning sales forecast table
   */
  private renderMorningSalesForecastTable = () => {
    if (!this.state.morningSalesForecastDataSheet) {
      return null;
    }

    return <SalesForecastDataTable
      title="Myyntiennuste AAMU"
      name="morning-sales-forecast"
      products={ this.state.products }
      setCellValue={ this.setMorningSalesForecastCellValue }
      getCellValue={ this.getMorningSalesForecastCellValue }
      getRowHeader={ this.getMorningSalesForecastRowHeader }
      setRowHeader={ this.setMorningSalesForecastRowHeader }
      onAddNewRow={ this.addMorningSalesForecastRow }
      rowCount={ this.state.morningSalesForecastDataSheet.data.length - 1}/>
  }

  /**
   * Returns row header for morning sales forecast table 
   * 
   * @param rowIndex row index
   * @return row header for morning sales forecast table
   */
  private getMorningSalesForecastRowHeader = (rowIndex: number): string => {
    if (!this.state.morningSalesForecastDataSheet) {
      return "";
    }

    const data: string[][] = this.state.morningSalesForecastDataSheet.data || [[]];
    return TableDataUtils.getCellValue(data, rowIndex, 0) || "Syötä nimi";
  }

  /**
   * Sets row header for morning sales forecast table 
   * 
   * @param rowIndex row index
   * @param value new value
   */
  private setMorningSalesForecastRowHeader = async (rowIndex: number, value: string) => {
    if (!this.state.morningSalesForecastDataSheet) {
      return;
    }

    let data: string[][] = this.state.morningSalesForecastDataSheet.data || [[]];
    data = TableDataUtils.setCellValue(data, rowIndex, 0, value);

    this.setState({
      morningSalesForecastDataSheet: await this.saveDataSheet(this.state.morningSalesForecastDataSheet, data)
    });
  }

  /**
   * Returns cell value for morning sales forecast table 
   * 
   * @param productId product id
   * @param rowIndex row index
   * @return cell value for morning sales forecast table 
   */
  private getMorningSalesForecastCellValue = (productId: string, rowIndex: number): number => {
    if (!this.state.morningSalesForecastDataSheet) {
      return 0;
    }

    const data: string[][] = this.state.morningSalesForecastDataSheet.data || [[]];
    const productIndex = TableDataUtils.findCellIndex(data, 0, productId);

    return parseFloat(TableDataUtils.getCellValue(data, rowIndex + 1, productIndex) || "0") || 0;
  }

  /**
   * Sets cell value for morning sales forecast table 
   * 
   * @param productId product id
   * @param rowIndex row index
   * @param value new value 
   */
  private setMorningSalesForecastCellValue = async (productId: string, rowIndex: number, value: number | null) => {
    if (!this.state.morningSalesForecastDataSheet) {
      return;
    }

    let data: string[][] = this.state.morningSalesForecastDataSheet.data || [[]];
    const productIndex = TableDataUtils.findCellIndex(data, 0, productId);
    data = TableDataUtils.setCellValue(data, rowIndex + 1, productIndex, String(value));

    this.setState({
      morningSalesForecastDataSheet: await this.saveDataSheet(this.state.morningSalesForecastDataSheet, data)
    });
  }

  /**
   * Adds new row to morning sales forecast table 
   */
  private addMorningSalesForecastRow = async () => {
    if (!this.state.morningSalesForecastDataSheet) {
      return;
    }

    this.setState({
      morningSalesForecastDataSheet: await this.addDataSheetRow(this.state.morningSalesForecastDataSheet)
    });
  }

  /**
   * Renders morning sales forecast table
   */
  private renderEveningSalesForecastTable = () => {
    if (!this.state.eveningSalesForecastDataSheet) {
      return null;
    }

    return <SalesForecastDataTable
      title="Myyntiennuste ILTA"
      name="evening-sales-forecast"
      products={ this.state.products }
      setCellValue={ this.setEveningSalesForecastCellValue }
      getCellValue={ this.getEveningSalesForecastCellValue }
      getRowHeader={ this.getEveningSalesForecastRowHeader }
      setRowHeader={ this.setEveningSalesForecastRowHeader }
      onAddNewRow={ this.addEveningSalesForecastRow }
      rowCount={ this.state.eveningSalesForecastDataSheet.data.length - 1}/>
  }

  /**
   * Returns row header for evening sales forecast table 
   * 
   * @param rowIndex row index
   * @return row header for evening sales forecast table
   */
  private getEveningSalesForecastRowHeader = (rowIndex: number): string => {
    if (!this.state.eveningSalesForecastDataSheet) {
      return "";
    }

    const data: string[][] = this.state.eveningSalesForecastDataSheet.data || [[]];
    return TableDataUtils.getCellValue(data, rowIndex, 0) || "Syötä nimi";
  }

  /**
   * Sets row header for evening sales forecast table 
   * 
   * @param rowIndex row index
   * @param value new value
   */
  private setEveningSalesForecastRowHeader = async (rowIndex: number, value: string) => {
    if (!this.state.eveningSalesForecastDataSheet) {
      return;
    }

    let data: string[][] = this.state.eveningSalesForecastDataSheet.data || [[]];
    data = TableDataUtils.setCellValue(data, rowIndex, 0, value);

    this.setState({
      eveningSalesForecastDataSheet: await this.saveDataSheet(this.state.eveningSalesForecastDataSheet, data)
    });
  }

  /**
   * Returns cell value for evening sales forecast table 
   * 
   * @param productId product id
   * @param rowIndex row index
   * @return cell value for evening sales forecast table 
   */
  private getEveningSalesForecastCellValue = (productId: string, rowIndex: number): number => {
    if (!this.state.eveningSalesForecastDataSheet) {
      return 0;
    }

    const data: string[][] = this.state.eveningSalesForecastDataSheet.data || [[]];
    const productIndex = TableDataUtils.findCellIndex(data, 0, productId);

    return parseFloat(TableDataUtils.getCellValue(data, rowIndex + 1, productIndex) || "0") || 0;
  }

  /**
   * Sets cell value for evening sales forecast table 
   * 
   * @param productId product id
   * @param rowIndex row index
   * @param value new value 
   */
  private setEveningSalesForecastCellValue = async (productId: string, rowIndex: number, value: number | null) => {
    if (!this.state.eveningSalesForecastDataSheet) {
      return;
    }

    let data: string[][] = this.state.eveningSalesForecastDataSheet.data || [[]];
    const productIndex = TableDataUtils.findCellIndex(data, 0, productId);
    data = TableDataUtils.setCellValue(data, rowIndex + 1, productIndex, String(value));

    this.setState({
      eveningSalesForecastDataSheet: await this.saveDataSheet(this.state.eveningSalesForecastDataSheet, data)
    });
  }

  /**
   * Adds new row to evening sales forecast table 
   */
  private addEveningSalesForecastRow = async () => {
    if (!this.state.eveningSalesForecastDataSheet) {
      return;
    }

    this.setState({
      eveningSalesForecastDataSheet: await this.addDataSheetRow(this.state.eveningSalesForecastDataSheet)
    });
  }

  /**
   * Counts delivey / sale balance for morning
   * 
   * @return delivey / sale balance for morning
   */
  private getMorningDeliveryBalance = (product: Product): number => {
    if (!this.state.morningSalesForecastDataSheet) {
      return 0;
    }

    const morningSalesForecastData = this.state.morningSalesForecastDataSheet.data || [];
    const morningDeliveries = this.state.deliveries.filter((delivery) => moment(delivery.time).utc().hour() <= 12);

    let morningForecastedSales = 0;
    for (let i = 0; i < morningSalesForecastData.length - 1; i++) {
      morningForecastedSales += this.getMorningSalesForecastCellValue(product.id!, i);
    };

    const morningDeliveryAmount = this.countDeliveryAmountByProduct(morningDeliveries, product, false);

    return morningDeliveryAmount - morningForecastedSales;
  }

  /**
   * Counts delivey / sale balance for evening
   * 
   * @return delivey / sale balance for evening
   */
  private getEveningDeliveryBalance = (product: Product): number => {
    if (!this.state.eveningSalesForecastDataSheet) {
      return 0;
    }

    const eveningSalesForecastData = this.state.eveningSalesForecastDataSheet.data || [];
    const eveningDeliveries = this.state.deliveries.filter((delivery) => moment(delivery.time).utc().hour() > 12);

    let eveningForecastedSales = 0;
    for (let i = 0; i < eveningSalesForecastData.length - 1; i++) {
      eveningForecastedSales += this.getEveningSalesForecastCellValue(product.id!, i);
    };

    const eveningDeliveryAmount = this.countDeliveryAmountByProduct(eveningDeliveries, product, false);

    return eveningDeliveryAmount - eveningForecastedSales;
  }

  /**
   * Renders summaries
   */
  private renderSummaries = () => {
    if (!this.state.morningSalesForecastDataSheet || !this.state.eveningSalesForecastDataSheet) {
      return null;
    }

    const products = this.state.products;
    const cellWidth = 100 / (products.length + 1);

    return (
      <Table>
        <Table.Row key={ "morning-summary-row" }>
          <Table.Cell style={{color: "#fff", background: "#e01e36", fontWeight: "bold" }} key={ "morning-summary-header" }> Aamuauton tilanne </Table.Cell>
          { 
            products.map((product) => {
              return (
                <Table.Cell style={{ textAlign: "center", "width": `${cellWidth}%`, color: "#fff", background: "#e01e36" }} key={ `morning-summary-cell-${product.id}` }>
                  { this.getMorningDeliveryBalance(product) }
                </Table.Cell>
              )
            }) 
          }
        </Table.Row>
        <Table.Row key={ "evening-summary-row" }>
          <Table.Cell style={{color: "#fff", background: "#e01e36", fontWeight: "bold" }} key={ "evening-summary-header" }> Iltauton tilanne </Table.Cell>
          { 
            products.map((product) => {
              return (
                <Table.Cell style={{ textAlign: "center", "width": `${cellWidth}%`, color: "#fff", background: "#e01e36" }} key={ `evening-summary-cell-${product.id}` }>
                  { this.getEveningDeliveryBalance(product) }
                </Table.Cell>
              )
            }) 
          }
        </Table.Row>
        <Table.Row key={ "daily-summary-row" }>
          <Table.Cell style={{color: "#fff", background: "#e01e36", fontWeight: "bold" }} key={ "daily-summary-header" }> Varastoon jäävä ennuste </Table.Cell>
          { 
            products.map((product) => {
              return (
                <Table.Cell style={{ textAlign: "center", "width": `${cellWidth}%`, color: "#fff", background: "#e01e36" }} key={ `daily-summary-cell-${product.id}` }>
                  { this.getMorningDeliveryBalance(product) + this.getEveningDeliveryBalance(product) }
                </Table.Cell>
              )
            }) 
          }
        </Table.Row>
      </Table>
    );
  }

  private addDataSheetRow = async (dataSheet: DataSheet): Promise<DataSheet> => {
    let data: string[][] = dataSheet.data || [[]];
    data.push([]);
    return await this.saveDataSheet(dataSheet, data); 
  }

  private prepareDataSheet = async (dataSheet: DataSheet): Promise<DataSheet> => {
    let data: string[][] = dataSheet.data || [[]];
    if (data.length < 1) {
      data.push([]);
    }

    this.state.products.forEach((product) => {
      const index = TableDataUtils.findCellIndex(data, 0, product.id!);
      if (index == -1) {
        const cellIndex = TableDataUtils.getCellCount(data, 0) || 1;
        data = TableDataUtils.setCellValue(data, 0, cellIndex, product.id!);
      }
    });

    if (_.isEqual(data, dataSheet.data)) {
      return dataSheet;
    } else {
      const updatedDataSheet = await this.saveDataSheet(dataSheet, data);
      return updatedDataSheet!;
    }
  }

  /**
   * Returns value for storage table
   * 
   * @param productId product id
   * @param qualityId quality id
   * @returns value or null if not found
   */
  private getStorageTableValue = (productId: string, qualityId: string): number | null => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return null;
    }

    if (!this.state.storageDataSheet || !this.state.storageDataSheet.id) {
      return null;
    }

    const data: string[][] = this.state.storageDataSheet.data || [[]];

    const productIndex = TableDataUtils.findCellIndex(data, 0, productId);
    const qualityIndex = TableDataUtils.findRowIndex(data, 0, qualityId);
    const cellValue = productIndex > -1 && qualityIndex > -1 ? TableDataUtils.getCellValue(data, qualityIndex, productIndex) : null;    

    return cellValue ? parseFloat(cellValue) || null : null;
  }

  /**
   * Applise storage table value
   */
  private onApplyStorageTableValue = async (productId: string, qualityId: string, value: number) => {
    if (!this.state.storageDataSheet || !this.state.storageDataSheet.id) {
      return;
    }

    const qualities = _.values(this.state.deliveryQualities);

    let data: string[][] = this.state.storageDataSheet.data || [[]];
    if (data.length < 1) {
      data.push([]);
    }

    qualities.forEach((quality) => {
      const index = TableDataUtils.findRowIndex(data, 0, quality.id!);
      if (index == -1) {
        data.push([quality.id!]);
      }
    });

    this.state.products.forEach((product) => {
      const index = TableDataUtils.findCellIndex(data, 0, product.id!);
      if (index == -1) {
        const cellIndex = TableDataUtils.getCellCount(data, 0) || 1;
        data = TableDataUtils.setCellValue(data, 0, cellIndex, product.id!);
      }
    });

    const productIndex = TableDataUtils.findCellIndex(data, 0, productId);
    const qualityIndex = TableDataUtils.findRowIndex(data, 0, qualityId);

    data = TableDataUtils.setCellValue(data, qualityIndex, productIndex, String(value));

    this.setState({
      storageDataSheet: await this.saveDataSheet(this.state.storageDataSheet, data)
    });
  }

  /**
   * Saves data sheet
   * 
   * @param dataSheet data sheet
   * @param data data
   * @return saved data shseet
   */
  private saveDataSheet = async (dataSheet: DataSheet, data: string[][]): Promise<DataSheet> => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token || !dataSheet.id) {
      throw new Error("Failed to save");
    }

    const dataSheetsService = Api.getDataSheetsService(keycloak.token);

    return await dataSheetsService.updateDataSheet({ ... dataSheet, data: data }, dataSheet.id);
  }

  private getTableRows(morning: boolean, deliveries: Delivery[], initialIndex?: number) {

    const { products } = this.state;
    const otherDeliveryPlace =  !!deliveries.find((delivery) => {
      return delivery.deliveryPlaceId !== this.state.deliveryPlaceId;
    });

    const tableRows: JSX.Element[] = [];
    let index = initialIndex || 0;
    const contactIds = _.uniq(deliveries.map(delivery => delivery.userId));
    for (let i = 0; i < contactIds.length; i++) {
      index++;
      let tableCells: JSX.Element[] = [];
      let contactId = contactIds[i];
      let contact = this.getContact(contactId);
      tableCells.push(<Table.Cell key={`${index}-${contactId}`}>{ contact ? <span> { contact.displayName  } { otherDeliveryPlace ? <Icon style={{ float: "right" }} name="map marker alternate" color="red"/> : null } </span> : <Loader size="mini" inline />}</Table.Cell>);
      for (let j = 0; j < products.length; j++) {
        let product = products[j];
        const productDeliveries = this.listContactDeliveries(contactId, product, deliveries);
        if (!productDeliveries.length) {
          tableCells.push(
            <Table.Cell
              key={`${index}-${contactId}-${product.id}`}
              selectable
              onClick={() => this.handleCreateDelivery(contactId, product, morning ? 11 : 17)} />
          );
        } else {
          if (productDeliveries.length > 1) {
            const deliveryButtons = productDeliveries.map((delivery) => {
              return <Button key={delivery.id} basic onClick={() => this.handleEditDelivery(delivery!)}> {delivery.amount} ({this.getDeliveryStatusText(delivery)}) </Button>
            });

            tableCells.push(
              <Table.Cell key={`${index}-${contactId}-${product.id}`} style={{ paddingLeft: "5px", paddingRight: "5px", textAlign: "center" }} selectable onClick={() => { }}>
                <Popup style={{ textAlign: "center", whiteSpace: "nowrap" }} wide trigger={<Button style={{ width: "100%" }} basic content='Valitse' />} on='click'>
                  {deliveryButtons}
                </Popup>
              </Table.Cell>
            );
          } else {
            const delivery = productDeliveries[0];
            const textStyle = this.getDeliveryTextStyle(delivery);
            tableCells.push(
              <Table.Cell
                key={`${index}-${contactId}-${product.id}`}
                style={{ ...textStyle, textAlign: "center" }}
                selectable
                onClick={() => this.handleEditDelivery(delivery!)}>
                {this.renderDeliveryIcon(delivery)}
                {delivery.amount}
              </Table.Cell>
            );
          }
        }
      }
      tableRows.push(<Table.Row key={`${index}-${contactId}`}>{tableCells}</Table.Row>)
    }

    return tableRows;
  }

  private getTableSummaryRow(keyPrefix: string, background: string, deliveries: Delivery[], headerText: string, onlyDelivered?: boolean) {
    const { products } = this.state;
    let tableCells: JSX.Element[] = [];
    tableCells.push(<Table.Cell key={`summary-row-${keyPrefix}`}>{headerText}</Table.Cell>);
    for (let j = 0; j < products.length; j++) {
      let product = products[j];
      tableCells.push(
        <Table.Cell key={`${headerText}-summary-cell-${product.id}`} style={{ paddingLeft: "5px", paddingRight: "5px", textAlign: "center", background: background, color: "#fff" }} onClick={() => { }}>
          {this.countDeliveryAmountByProduct(deliveries, product, onlyDelivered)}
        </Table.Cell>
      );
    }

    return (<Table.Row className={onlyDelivered ? "summary-delivered-row" : "summary-total-row"} key={`${headerText}-summary-row`}>{tableCells}</Table.Row>);
  }

  private countDeliveryAmountByProduct(deliveries: Delivery[], product: Product, onlyDelivered?: boolean) {
    let count = 0;

    deliveries.forEach((delivery) => {
      if (delivery.productId === product.id) {
        if (onlyDelivered) {
          if (delivery.status === "DONE") {
            count += delivery.amount;
          }
        } else {
          count += delivery.amount;
        }
      }
    });

    return count;
  }

  private getContact(contactId: string) {
    const contact = this.state.contacts.find((contact) => contact.id === contactId);
    if (contact) {
      return contact;
    }

    this.loadContact(contactId);
    return undefined;
  }

  private loadContact = async (contactId: string) => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return undefined;
    }

    const contact = await Api.getContactsService(keycloak.token).findContact(contactId);
    const currentContacts = [...this.state.contacts];
    currentContacts.push(contact);
    this.setState({
      contacts: currentContacts
    });

    return contact;
  }

  /**
   * Renders delivery icon
   * 
   * @param delivery delivery
   */
  private renderDeliveryIcon(delivery: Delivery) {
    if (delivery.status == "DELIVERY") {
      return <Image src={IncomingDeliveryIcon} style={{ display: "inline-block", maxWidth: "32px", marginRight: "10px" }} />
    }

    if (delivery.qualityId) {
      const deliveryQuality = this.state.deliveryQualities[delivery.qualityId];
      return <Icon size="small" style={{ color: deliveryQuality ? deliveryQuality.color : "#000" }} name="circle" />
    }

    return null;
  }

  /**
   * Returns delivery status text
   */
  private getDeliveryStatusText = (delivery: Delivery) => {
    switch (delivery.status) {
      case "DELIVERY":
        return "Toimituksessa";
      case "DONE":
        return "Hyväksytty";
      case "PLANNED":
        return "Suunnitelma";
      case "PROPOSAL":
        return "Ehdotus";
      case "REJECTED":
        return "Hylätty";
    }
  }

  private addProposal = async () => {
    const { keycloak } = this.props;
    const { proposalContactId, proposalProduct, proposalAmount, proposalTime, selectedDate } = this.state;
    if (!keycloak || !keycloak.token || !proposalContactId || !proposalAmount || !proposalProduct || !proposalAmount) {
      return;
    }

    this.setState({
      addingProposal: true
    });


    let time: string | Date = moment(selectedDate).format("YYYY-MM-DD");
    time = `${time} ${proposalTime}:00 +0000`
    time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();

    await Api.getDeliveriesService(keycloak.token).createDelivery({
      amount: proposalAmount,
      deliveryPlaceId: this.state.deliveryPlaceId,
      productId: proposalProduct.id!,
      status: "PROPOSAL",
      time: time,
      userId: proposalContactId!
    });

    this.setState({
      addingProposal: false,
      proposalAmount: undefined,
      proposalContactId: undefined,
      proposalProduct: undefined,
      proposalTime: undefined
    });

    this.updateTableData();
  }

  /**
   * Returns style for delivery
   * 
   * @param delivery delivery
   */
  private getDeliveryTextStyle(delivery: Delivery) {
    switch (delivery.status) {
      case "DELIVERY":
        return { color: "#000" };
      case "DONE":
        return { color: "#4bb543" };
      case "PROPOSAL":
      case "PLANNED":
        return { color: "#aaa" };
      case "REJECTED":
        return { color: "#ff0000" };
    }
  }

  /**
   * Lists contact deliveries by product
   * 
   * @param contact contact
   * @param product product
   */
  private listContactDeliveries(contactId: string, product: Product, deliveries: Delivery[]): Delivery[] {
    return (deliveries || []).filter((delivery) => delivery.productId == product.id && delivery.userId == contactId);
  }

  /**
   * Refreshes deliveries from the server. Method does not show operation to the user
   */
  private reloadDeliveries = async () => {
    const { keycloak } = this.props;
    if (keycloak && keycloak.token && !this.state.loading) {
      if (keycloak && keycloak.token) {
      const deliveries = await this.loadDeliveries(keycloak.token);
      this.setState({ deliveries: deliveries });
      }
    }
  }

  /**
   * Loads delieries from the server
   * 
   * @param token access token
   */
  private loadDeliveries = (token: string) => {
    const { selectedDate } = this.state;
    const timeBefore = moment(selectedDate).endOf("day").toDate();
    const timeAfter = moment(selectedDate).startOf("day").toDate();
    return Api.getDeliveriesService(token).listDeliveries(
      undefined,
      undefined,
      "FRESH",
      undefined,
      undefined,
      undefined,
      timeBefore,
      timeAfter,
      0,
      9999);
  }

  /**
   * Updates table data and shows a loading screen 
   */
  private updateTableData = async () => {
    const { keycloak } = this.props;
    
    if (keycloak && keycloak.token) {
      this.setState({ loading: true });
      const deliveries = await this.loadDeliveries(keycloak.token);
      this.setState({ loading: false, deliveries: deliveries });
    }
  }

  private handleCreateDelivery = (contactId: string, product: Product, time: number) => {
    this.setState({
      proposalContactId: contactId,
      proposalProduct: product,
      proposalTime: time
    });
  }

  private handleEditDelivery = (delivery: Delivery) => {
    this.setState({
      selectedDelivery: delivery
    });
  }

  /**
   * Handles error from components
   * 
   * @param msg error message
   */
  private handleError = (msg: string) => {
    this.setState({
      error: msg
    });
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

export default connect(mapStateToProps, mapDispatchToProps)(FreshDeliveryManagement);
