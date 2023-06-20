import * as React from "react";

import { Button, ButtonProps } from "semantic-ui-react";

interface Props extends Omit<ButtonProps, "onClick"> {
  onClick?: () => void | Promise<void>;
}

/**
 * Component state
 */
interface State {
  loading: boolean;
}

/**
 * Class for button component that performs asynchronous function calls
 */
class AsyncButton extends React.Component<Props, State> {

  private mounted: boolean = false;

  /**
   * Component constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false
    }
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = () => {
    this.mounted = true;
  }

  /**
   * Component will unmount life-cycle event
   */
  public componentWillUnmount = () => {
    this.mounted = false;
  }

  /**
   * Component render
   */
  public render = () => {
    const { children, disabled } = this.props;
    const { loading } = this.state

    return (
      <Button
        { ...this.props }
        disabled={ loading || disabled }
        loading={ loading }
        onClick={ this.handleClick }
      >
        { children }
      </Button>
    );
  }

  /**
   * Method for handling button press
   */
  private handleClick = async () => {
    const { onClick } = this.props;

    if (!onClick) {
      return;
    }

    this.setState({ loading: true });

    try {
      await onClick();
    } catch (error) {
      console.warn(error);
    }

    if (this.mounted) {
      this.setState({ loading: false });
    }
  }
}

export default AsyncButton;
