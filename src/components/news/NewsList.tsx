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
import ApplicationRoles from "src/utils/application-roles";
import strings from "src/localization/strings";

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
    const sortedNewsArticles = newsArticles.sort((a, b) => {
      return this.getTime(b.createdAt) - this.getTime(a.createdAt)
    });

    this.setState({ newsArticles: sortedNewsArticles, loading: false });
  }

  /**
   * Get time
   * 
   * @param date date
   */
  private getTime(date?: Date) {
    return date ? new Date(date).getTime() : 0;
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
              {strings.loading}
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }
    
    return (
      <BasicLayout>
        {this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.MANAGE_NEWS_ARTICLES) && 
          <Link to="/createNews">
            <Button attached="top" color="red">{strings.createNewArticle}</Button>
          </Link>
        }
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