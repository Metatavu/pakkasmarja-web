import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import Api from "pakkasmarja-client";
import { NewsArticle } from "pakkasmarja-client";
import NewsComponent from "./NewsComponent";
import { Button, Segment, Item, Dimmer, Loader } from "semantic-ui-react";
import { Link } from "react-router-dom";

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
  newsArticles: NewsArticle[];
  loading: boolean;
}

class NewsList extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      newsArticles: [],
      loading: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loading: true });
    const newArticleService = await Api.getNewsArticlesService(this.props.keycloak.token);
    const newsArticles = await newArticleService.listNewsArticles();
    this.setState({ newsArticles, loading: false });
  }

  /**
   * Render
   */
  public render() {
    if (this.state.loading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan uutisia
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }
    
    return (
      <BasicLayout>
        <Link to="/createNews">
          <Button attached="top" color="red">Create news</Button>
        </Link>
        <Segment attached>
          <Item.Group divided>
            {
              this.state.newsArticles.map((news) => {
                return <NewsComponent key={news.id} data={news} />;
              })
            }
          </Item.Group>
        </Segment>
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

export default connect(mapStateToProps, mapDispatchToProps)(NewsList);