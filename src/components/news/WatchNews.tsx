import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import BasicLayout from "../generic/BasicLayout";
import Api, { NewsArticle, Unread } from "pakkasmarja-client";
import { Divider, Container, Header, Image } from "semantic-ui-react";
import Moment from "react-moment";
import { FileService } from "src/api/file.service";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
  match?: any,
  unreads: Unread[]
}

/**
 * Interface for component state
 */
interface State {
  news?: NewsArticle;
  redirect: boolean;
  imageBase64?: string;
}

class WatchNews extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      news: undefined,
      redirect: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const newArticleService = await Api.getNewsArticlesService(this.props.keycloak.token);
    newArticleService.findNewsArticle(this.props.match.params.newsId).then((newsArticle) => {
      const newsArticleObject: NewsArticle = newsArticle;
      this.setImage(newsArticle.imageUrl || "");
      this.setState({ news: newsArticleObject });
    });

    this.markRead();
  }

  /**
   * On image selected
   * 
   * @param url url
   */
  private setImage = async (url: string) => {
    if (!url || !this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL) {
      return;
    }
    
    const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
    const imageData = await fileService.getFile(url);

    this.setState({ 
      imageBase64: `data:image/jpeg;base64,${imageData.data}`
    });
  }

  public render() {
    if (this.state.news && this.state.news.createdAt) {
      return (
        
        <BasicLayout>
          <Header >
            <h2 style={{wordWrap: "break-word"}}>{this.state.news.title.toString()}</h2>
            <Header.Subheader><Moment format="DD.MM.YYYY HH:mm">{this.state.news.createdAt.toString()}</Moment></Header.Subheader>
          </Header>
          {
            this.state.imageBase64 &&
              <Image
                src={this.state.imageBase64} 
                size="medium"
                bordered={true}
              />
          }
          <Divider />
          <Container>
            <div dangerouslySetInnerHTML={{ __html: this.state.news.contents }} />
          </Container>
        </BasicLayout>
      );
    }
    return (
      <BasicLayout>

      </BasicLayout>
    );
  }

  /**
   * Retuns related unread
   * 
   * @return related unread
   */
  private markRead = () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const unread = this.props.unreads.find((unread: Unread) => {
      return (unread.path || "").startsWith(`news-${this.state.news ? this.state.news.id : ""}`);
    });

    if (!unread) {
      return;
    }

    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    Api.getUnreadsService(this.props.keycloak.token).deleteUnread(unread.id!);
  }
}

export function mapStateToProps(state: StoreState) {
  return {
    keycloak: state.keycloak,
    unreads: state.unreads
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(WatchNews);